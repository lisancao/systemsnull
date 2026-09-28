---
title: "The PySpark UDF Showdown: pandas_udf vs. mapInPandas vs. mapInArrow vs. arrow_udf"
date: 2026-09-28
description: "Four APIs, one question: what actually happens to your data when it crosses the JVM-Python boundary? This post puts each approach side by side -- same problem, same data, different code paths -- so you can see exactly where the time goes and pick the right tool."
tags: [spark, pyspark, arrow]
featured: true
---

PySpark has accumulated four distinct ways to run vectorized Python code on DataFrames. They all use Apache Arrow for transport. They all process data in batches. From the outside, they look interchangeable. They aren't.

The difference is what happens *after* the data arrives in Python. One approach converts to pandas. Another stays in Arrow. One works on whole partitions. Another works on single columns. These aren't cosmetic differences -- they determine whether your UDF spends more time converting data or computing on it.

This post compares all four by solving the same problems with each, then traces the internal data flow to show where the performance diverges.

---

## The Setup: What We're Comparing

| API | Introduced | Input Format | Scope | Use Case |
|-----|-----------|-------------|-------|----------|
| `@pandas_udf` | Spark 2.3 (2018) | `pd.Series` | Column transform | Vectorized column operations using pandas |
| `mapInPandas` | Spark 3.0 (2020) | `Iterator[pd.DataFrame]` | Full partition | Partition-level transforms, schema changes |
| `mapInArrow` | Spark 3.3 (2022) | `Iterator[pa.RecordBatch]` | Full partition | Same as `mapInPandas`, no pandas conversion |
| `@arrow_udf` | Spark 4.1 (2025) | `pa.Array` | Column transform | Zero-copy vectorized column operations |

All four use Arrow as the serialization format between JVM and Python. The critical difference is the **last mile** -- what format your function actually receives.

---

## The Data Flow: Where Your Time Goes

Understanding performance requires tracing the exact path data takes through each API. Here's what happens for each, from the moment Spark calls your function to the moment it gets the result back.

### pandas_udf

```
JVM (ColumnarBatch)
  │
  ├─ Arrow IPC serialize ──────────> Python worker receives Arrow RecordBatch
  │                                   │
  │                                   ├─ RecordBatch.to_pandas()  ← EXPENSIVE: copies data,
  │                                   │                              creates NumPy arrays,
  │                                   │                              builds pandas index
  │                                   │
  │                                   ├─ YOUR FUNCTION (pd.Series → pd.Series)
  │                                   │
  │                                   ├─ Table.from_pandas()      ← EXPENSIVE: validates dtypes,
  │                                   │                              copies back to Arrow buffers
  │                                   │
  │                                   └─ Arrow IPC serialize ──────────> JVM deserializes
```

**Memory copies:** ~5 (JVM→Arrow, Arrow→pandas, user function, pandas→Arrow, Arrow→JVM)

### mapInPandas

```
JVM (ColumnarBatch)
  │
  ├─ Arrow IPC serialize ──────────> Python worker receives Iterator[RecordBatch]
  │                                   │
  │                                   ├─ RecordBatch.to_pandas()  ← same conversion cost
  │                                   │
  │                                   ├─ YOUR FUNCTION (Iterator[pd.DataFrame] → Iterator[pd.DataFrame])
  │                                   │
  │                                   ├─ Table.from_pandas()      ← same conversion cost
  │                                   │
  │                                   └─ Arrow IPC serialize ──────────> JVM deserializes
```

**Memory copies:** ~5 (same as `pandas_udf`)

The data flow is identical to `pandas_udf`. The difference is structural: your function receives an *iterator* of DataFrames (all columns, streaming), not a single Series (one column, one batch). Same overhead, different API shape.

### mapInArrow

```
JVM (ColumnarBatch)
  │
  ├─ Arrow IPC serialize ──────────> Python worker receives Iterator[RecordBatch]
  │                                   │
  │                                   ├─ (NO CONVERSION -- stays as pyarrow.RecordBatch)
  │                                   │
  │                                   ├─ YOUR FUNCTION (Iterator[RecordBatch] → Iterator[RecordBatch])
  │                                   │
  │                                   ├─ (NO CONVERSION -- returns pyarrow.RecordBatch directly)
  │                                   │
  │                                   └─ Arrow IPC serialize ──────────> JVM deserializes
```

**Memory copies:** ~2 (JVM→Arrow, Arrow→JVM). User function can be zero-copy for read-only operations.

This is the key insight: `mapInArrow` has the same API shape as `mapInPandas` (iterator in, iterator out, full partition access), but it **never touches pandas**. The `to_pandas()` and `from_pandas()` calls -- which account for 40-60% of total overhead in pandas-based APIs -- simply don't exist.

### arrow_udf

```
JVM (ColumnarBatch)
  │
  ├─ Arrow IPC serialize (column only) ──> Python worker receives pa.Array (single column)
  │                                         │
  │                                         ├─ (NO CONVERSION -- stays as pyarrow.Array)
  │                                         │
  │                                         ├─ YOUR FUNCTION (pa.Array → pa.Array)
  │                                         │
  │                                         ├─ (NO CONVERSION -- returns pa.Array directly)
  │                                         │
  │                                         └─ Arrow IPC serialize (column only) ──> JVM deserializes
```

**Memory copies:** ~2, but on **less data** (only the columns your function uses, not the whole DataFrame).

`arrow_udf` is the thinnest wrapper. It operates at the column level -- like `pandas_udf` -- but never converts to pandas. And because it only serializes the columns referenced by the function, it moves less data across the socket than `mapInArrow`.

---

## Head-to-Head: Same Problem, Four Solutions

### Problem 1: Column Transform (Numeric)

Compute `(price + 1.0) * tax_rate` for every row.

**pandas_udf:**
```python
from pyspark.sql.functions import pandas_udf
import pandas as pd

@pandas_udf("double")
def compute_total_pandas(price: pd.Series, tax_rate: pd.Series) -> pd.Series:
    return (price + 1.0) * tax_rate

df.withColumn("total", compute_total_pandas("price", "tax_rate"))
```

**arrow_udf:**
```python
from pyspark.sql.functions import arrow_udf
import pyarrow as pa
import pyarrow.compute as pc

@arrow_udf("double")
def compute_total_arrow(price: pa.Array, tax_rate: pa.Array) -> pa.Array:
    return pc.multiply(pc.add(price, pa.scalar(1.0)), tax_rate)

df.withColumn("total", compute_total_arrow("price", "tax_rate"))
```

**mapInPandas:**
```python
def compute_total_map_pandas(iterator):
    for pdf in iterator:
        pdf["total"] = (pdf["price"] + 1.0) * pdf["tax_rate"]
        yield pdf[["id", "total"]]

df.mapInPandas(compute_total_map_pandas, schema="id long, total double")
```

**mapInArrow:**
```python
import pyarrow.compute as pc

def compute_total_map_arrow(iterator):
    for batch in iterator:
        total = pc.multiply(
            pc.add(batch.column("price"), pa.scalar(1.0)),
            batch.column("tax_rate")
        )
        yield pa.RecordBatch.from_arrays(
            [batch.column("id"), total],
            names=["id", "total"]
        )

df.mapInArrow(compute_total_map_arrow, schema="id long, total double")
```

**Verdict:** For a simple column transform, `arrow_udf` is the right choice. It's the least code, the thinnest data path, and the fastest. `pandas_udf` is the natural fallback if you need pandas-specific operations. The `mapIn*` variants are overkill here -- they're designed for partition-level operations, and using them for column math adds unnecessary boilerplate.

---

### Problem 2: Filtering Rows Within a Partition

Remove all rows where `status == "cancelled"` and `amount < 10.0`.

This is where `mapIn*` shines. UDFs (both `pandas_udf` and `arrow_udf`) are column transforms -- they can't change the number of rows. Partition-level APIs can.

**mapInPandas:**
```python
def filter_pandas(iterator):
    for pdf in iterator:
        mask = (pdf["status"] != "cancelled") | (pdf["amount"] >= 10.0)
        yield pdf[mask]

df.mapInPandas(filter_pandas, schema=df.schema)
```

**mapInArrow:**
```python
import pyarrow.compute as pc

def filter_arrow(iterator):
    for batch in iterator:
        not_cancelled = pc.not_equal(batch.column("status"), "cancelled")
        above_threshold = pc.greater_equal(batch.column("amount"), 10.0)
        mask = pc.or_(not_cancelled, above_threshold)
        yield batch.filter(mask)

df.mapInArrow(filter_arrow, schema=df.schema)
```

**pandas_udf / arrow_udf:** Not applicable. UDFs produce one output value per input row. They can't remove rows.

**Verdict:** `mapInArrow` wins. Same logic, no pandas conversion. But note that this specific filter is better expressed with native Spark:

```python
# Always prefer this -- pure JVM, no Python involved
df.filter((col("status") != "cancelled") | (col("amount") >= 10.0))
```

Use `mapIn*` for filters that *can't* be expressed in Spark SQL -- complex business rules, ML model scoring to decide which rows to keep, or operations that couple filtering with transformation.

---

### Problem 3: String Cleaning Pipeline

Trim whitespace, collapse multiple spaces, uppercase, and expand abbreviations.

**pandas_udf:**
```python
@pandas_udf("string")
def clean_address_pandas(raw: pd.Series) -> pd.Series:
    result = raw.str.strip()
    result = result.str.replace(r"\s+", " ", regex=True)
    result = result.str.upper()
    result = result.str.replace(" ST ", " STREET ")
    result = result.str.replace(" AVE ", " AVENUE ")
    return result

df.withColumn("address_clean", clean_address_pandas("address"))
```

**arrow_udf:**
```python
@arrow_udf("string")
def clean_address_arrow(raw: pa.Array) -> pa.Array:
    trimmed = pc.utf8_trim(raw)
    single_spaced = pc.replace_substring_regex(trimmed, pattern=r"\s+", replacement=" ")
    upper = pc.utf8_upper(single_spaced)
    result = pc.replace_substring(upper, pattern=" ST ", replacement=" STREET ")
    result = pc.replace_substring(result, pattern=" AVE ", replacement=" AVENUE ")
    return result

df.withColumn("address_clean", clean_address_arrow("address"))
```

**Verdict:** This is where `arrow_udf` shows its biggest advantage over `pandas_udf`. Pandas stores strings as Python objects in a NumPy object array -- each string is a separate heap allocation. Arrow stores strings as contiguous UTF-8 buffers with offset arrays. String operations on Arrow are **10-13x faster** than on pandas object arrays, because the data is dense and cache-friendly instead of scattered across the heap.

---

### Problem 4: Partition-Level ML Scoring

Load a model once per partition, score all rows.

**mapInPandas:**
```python
def score_pandas(iterator):
    import joblib
    model = joblib.load("/models/scorer.pkl")  # one-time cost

    for pdf in iterator:
        pdf["score"] = model.predict(pdf[["feature1", "feature2", "feature3"]])
        yield pdf[["id", "score"]]

df.mapInPandas(score_pandas, schema="id long, score double")
```

**mapInArrow:**
```python
def score_arrow(iterator):
    import joblib
    model = joblib.load("/models/scorer.pkl")  # one-time cost

    for batch in iterator:
        # Most sklearn models expect NumPy, so convert only the feature columns
        features = batch.select(["feature1", "feature2", "feature3"]).to_pandas().values
        scores = model.predict(features)
        yield pa.RecordBatch.from_arrays(
            [batch.column("id"), pa.array(scores, type=pa.float64())],
            names=["id", "score"]
        )

df.mapInArrow(score_arrow, schema="id long, score double")
```

**arrow_udf (iterator variant):**
```python
from typing import Iterator

@arrow_udf("double")
def score_arrow_udf(
    batches: Iterator[tuple[pa.Array, pa.Array, pa.Array]]
) -> Iterator[pa.Array]:
    import joblib
    model = joblib.load("/models/scorer.pkl")  # one-time cost

    for f1, f2, f3 in batches:
        # Stack features into a 2D array for sklearn
        import numpy as np
        features = np.column_stack([f1.to_numpy(), f2.to_numpy(), f3.to_numpy()])
        scores = model.predict(features)
        yield pa.array(scores, type=pa.float64())

df.withColumn("score", score_arrow_udf("feature1", "feature2", "feature3"))
```

**Verdict:** All three work. The choice depends on what your model expects:

- If the model takes pandas DataFrames (most sklearn models), `mapInPandas` is the simplest -- the data is already in the right format.
- If you're converting to NumPy anyway (like the `mapInArrow` example), you're paying a conversion cost regardless, so the Arrow advantage is reduced.
- The `arrow_udf` iterator variant amortizes model loading across all batches and keeps column-level granularity, but the code is more verbose.

In I/O-bound or compute-bound UDFs (model inference typically takes milliseconds to seconds per batch), serialization format is irrelevant. A model that takes 500ms to score a batch of 10,000 rows makes the 40ms difference between Arrow and pandas conversion invisible.

---

### Problem 5: Per-Group Normalization

Z-score normalize a column within each group.

**applyInPandas:**
```python
def normalize_pandas(pdf: pd.DataFrame) -> pd.DataFrame:
    mean = pdf["total"].mean()
    std = pdf["total"].std()
    pdf["normalized"] = (pdf["total"] - mean) / std if std else 0.0
    return pdf

orders.groupBy("location_id").applyInPandas(
    normalize_pandas,
    schema="location_id long, order_id long, total double, normalized double"
)
```

**applyInArrow:**
```python
def normalize_arrow(batch: pa.RecordBatch) -> pa.RecordBatch:
    totals = batch.column("total")
    mean = pc.mean(totals).as_py()
    std = pc.stddev(totals).as_py()

    if std is None or std == 0:
        normalized = pa.array([0.0] * len(totals), type=pa.float64())
    else:
        centered = pc.subtract(totals, pa.scalar(mean))
        normalized = pc.divide(centered, pa.scalar(std))

    return pa.RecordBatch.from_arrays(
        [batch.column("location_id"), batch.column("order_id"),
         totals, normalized],
        names=["location_id", "order_id", "total", "normalized"]
    )

orders.groupBy("location_id").applyInArrow(
    normalize_arrow,
    schema="location_id long, order_id long, total double, normalized double"
)
```

**Verdict:** `applyInArrow` is faster for groups with 1,000+ rows. Below that, the pandas conversion overhead is negligible and `applyInPandas` is simpler code. Neither `pandas_udf` nor `arrow_udf` can do this -- they're column transforms, not group operations.

---

## Performance: Where It Actually Matters

Approximate overhead per 10M rows, normalized to Arrow serialization time:

| API | Arrow Ser/De | Pandas Conversion | Data Scope | Total Overhead |
|-----|-------------|-------------------|------------|----------------|
| `arrow_udf` | ~300ms | 0ms | Columns used only | **~300ms** |
| `mapInArrow` | ~500ms | 0ms | All columns | **~500ms** |
| `pandas_udf` | ~500ms | ~2,000ms | Columns used only | **~2,500ms** |
| `mapInPandas` | ~500ms | ~2,000ms | All columns | **~2,500ms** |

The gap is the pandas conversion. `to_pandas()` and `from_pandas()` together account for 80% of the non-user-code overhead in the pandas-based APIs. For string-heavy data, the gap widens further because pandas stores strings as scattered Python objects while Arrow keeps them in contiguous buffers.

### When the Gap Doesn't Matter

These numbers are overhead *on top of* your function's execution time. If your function takes 10 seconds per batch (ML inference, API calls, heavy computation), saving 2 seconds of pandas conversion is a 17% improvement. Real, but not transformative. If your function takes 10 milliseconds per batch (simple arithmetic), saving 2 seconds is a **200x improvement**.

**Rule of thumb:** the simpler your function, the more the serialization format matters. Complex, compute-heavy functions amortize the overhead into noise.

---

## The Decision Framework

```
Q1: Can you use a built-in Spark function?
 │
 ├─ YES → Use it. 10-100x faster than any Python UDF. STOP.
 │
 └─ NO ↓

Q2: Is this a column-level transform (one value per row)?
 │
 ├─ YES → Can the logic be expressed with pyarrow.compute?
 │   │
 │   ├─ YES → @arrow_udf                    (fastest Python UDF)
 │   │
 │   └─ NO → Does it need pandas/numpy/scipy features?
 │       │
 │       ├─ YES → @pandas_udf               (vectorized, familiar API)
 │       │
 │       └─ NO → @udf(useArrow=True)        (per-row, Arrow transport)
 │
 └─ NO ↓

Q3: Does it need to change row count, access all columns, or control output schema?
 │
 ├─ YES → Can the logic stay in Arrow (pyarrow.compute)?
 │   │
 │   ├─ YES → mapInArrow                    (no pandas overhead)
 │   │
 │   └─ NO → mapInPandas                    (full pandas ecosystem)
 │
 └─ NO ↓

Q4: Is it a per-group operation (normalize within groups, per-group model)?
 │
 ├─ YES and can use pyarrow → applyInArrow
 ├─ YES and needs pandas    → applyInPandas
 │
 └─ NO → @udf(useArrow=True)               (default fallback)
```

---

## The Bigger Picture

These four APIs represent a decade of convergence on one idea: **data should stay in Arrow format as long as possible.**

```
2018: pandas_udf           → Arrow transport, but converts to pandas for execution
2020: mapInPandas           → Same transport, iterator API, still converts to pandas
2022: mapInArrow            → Arrow transport, Arrow execution. No pandas.
2025: arrow_udf             → Arrow transport, Arrow execution, column-only. Thinnest path.
```

Each step removed a conversion layer. `pandas_udf` eliminated pickle. `mapInArrow` eliminated pandas. `arrow_udf` eliminated full-DataFrame serialization, narrowing the pipe to only the columns you need.

The trajectory is clear: if you're writing new code in Spark 4.x, default to `arrow_udf` for column transforms and `mapInArrow` for partition operations. Use the pandas variants when you genuinely need pandas-specific functionality -- rolling windows, pivot tables, scipy integration. Not as a default, but as a deliberate choice based on library requirements.

And always check the built-in functions first. The fastest Python UDF is the one you didn't write.

---

## References

[1] Li Jin (Two Sigma). "Introducing Pandas UDF for PySpark." Databricks Blog, 2017. https://www.databricks.com/blog/2017/10/30/introducing-vectorized-udfs-for-pyspark.html

[2] Xinrong Meng. "Arrow-optimized Python UDFs in Apache Spark 3.5." Databricks Blog, 2023. https://www.databricks.com/blog/arrow-optimized-python-udfs-apache-sparktm-35

[3] SPARK-53014: Arrow UDF public API. https://issues.apache.org/jira/browse/SPARK-53014

[4] SPARK-37227: mapInArrow. https://issues.apache.org/jira/browse/SPARK-37227

[5] SPARK-40307: Arrow-optimized Python UDFs. https://issues.apache.org/jira/browse/SPARK-40307

[6] SPARK-48516: Arrow optimization on by default. https://issues.apache.org/jira/browse/SPARK-48516

[7] SPARK-40559: applyInArrow. https://issues.apache.org/jira/browse/SPARK-40559

[8] SPARK-21190: Pandas UDFs. https://issues.apache.org/jira/browse/SPARK-21190

[9] Apache Arrow in PySpark. https://spark.apache.org/docs/latest/api/python/tutorial/sql/arrow_pandas.html

[10] PyArrow Compute Functions. https://arrow.apache.org/docs/python/compute.html
