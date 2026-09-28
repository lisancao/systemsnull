---
title: "From Event Stream to Live Truth: AUTO CDC in Spark Declarative Pipelines"
date: 2026-09-28
description: "Your lakehouse is full of facts: orders placed, rows changed, sensors pinged. But the questions people actually ask are about the present: what's the status of this order right now? AUTO CDC, newly donated to Apache Spark, turns a stream of changes into an always-current table with four declarative"
tags: [spark, declarative-pipelines, cdc]
---

Most data lands as an append-only log. Orders emit a lifecycle of events; an operational database emits a change feed; sensors emit readings. Logs are great at answering *what happened*. They're terrible at answering *what is true now*, and "what is true now" is what dashboards, ML features, and operations teams overwhelmingly need.

Collapsing a change stream into current state sounds trivial until you try it: you have to match each change to the right row, keep the **latest** version per key even when events arrive out of order, apply **deletes**, and stay correct when the stream redelivers after a failure. People hand-roll this with `foreachBatch` + `MERGE` + windowed dedup, and they get the edge cases wrong, silently.

**AUTO CDC** is the declarative answer. It originated as Databricks' Delta Live Tables `APPLY CHANGES`, was donated to Apache Spark as part of [Spark Declarative Pipelines (SDP)](https://issues.apache.org/jira/browse/SPARK-51727), and was renamed `create_auto_cdc_flow`. This post is a hands-on tour: getting started, where it's used, what we ran against a million events a day, and the cases you need to know about.

> **Release note.** AUTO CDC is brand new: it landed on Apache Spark `master` *after* the `4.2.0-preview5` cut, so as of this writing you build from source to use it. The API below is what it looks like today; open-source supports **SCD Type 1**.

---

## CDC in one minute

A **change feed** is an ordered log of change events. Each carries an operation (`INSERT`/`UPDATE`/`DELETE`), a key, the row payload, and a **sequence** (a log offset, commit timestamp, or version):

```
{"op":"INSERT", "id":1, "name":"Alice", "city":"New York",  "seq":1}
{"op":"UPDATE", "id":1, "name":"Alice", "city":"Boston",    "seq":3}
{"op":"DELETE", "id":2,                                     "seq":2}
```

Applying it correctly is the hard part: match on key, keep the **highest-sequence** version per key (events arrive out of order), honor deletes, and be idempotent under reprocessing. That requires **row-level `MERGE`** into the target, which means the target must be a transactional format like **Iceberg** or **Delta**, not plain Parquet.

If you've heard of **Slowly Changing Dimensions**, that's the same idea from the data-warehouse world: **SCD Type 1** overwrites in place (current state, no history); **SCD Type 2** keeps history with validity ranges. AUTO CDC computes these from a change feed. OSS Spark supports Type 1 today.

---

## Getting started: three declarations

AUTO CDC is a flow inside a declarative pipeline. The pattern is always the same three pieces: a streaming **source**, a **target** streaming table, and the **flow** that applies one to the other:

```python
from pyspark import pipelines as dp
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, LongType

CDC_SCHEMA = StructType([
    StructField("id", IntegerType()), StructField("name", StringType()),
    StructField("city", StringType()), StructField("op", StringType()),
    StructField("seq", LongType()),
])

# 1. the change feed as a streaming source (a glob, not a bare dir; see gotchas)
@dp.table(name="cdc_customers_source")
def cdc_customers_source():
    return spark.readStream.schema(CDC_SCHEMA).json("/data/cdc/*.json")

# 2. the target the changes are applied into
dp.create_streaming_table("ice.silver.customers")

# 3. the declarative apply: no foreachBatch, no MERGE, no window dedup
dp.create_auto_cdc_flow(
    target="ice.silver.customers",
    source="cdc_customers_source",
    keys=["id"],                       # how to match a row
    sequence_by="seq",                 # highest seq per key wins (out-of-order safe)
    apply_as_deletes="op = 'DELETE'",  # which events delete a row
    except_column_list=["op", "seq"],  # keep id/name/city; drop bookkeeping
    stored_as_scd_type=1,              # overwrite in place, no history
)
```

The engine handles everything the hand-rolled version gets wrong: cross-batch deduplication by `sequence_by`, the generated `MERGE` (upsert + delete), exactly-once checkpointing, and a durable auxiliary state table (`__spark_autocdc_aux_state_<target>`) that remembers per-key sequencing across runs.

Two requirements to internalize up front:

- **The target must support row-level MERGE**: Iceberg or Delta. A plain Parquet target fails fast with `AUTOCDC_TARGET_DOES_NOT_SUPPORT_MERGE`.
- **The source must be streaming** (`spark.readStream`). AUTO CDC is a streaming flow.

---

## Where AUTO CDC actually gets used

It shows up anywhere you need a table that reflects the **current state** of an entity that keeps changing:

1. **Database replication / mirroring**: the #1 use. A Debezium/CDF feed off an OLTP table → a lakehouse mirror that stays current. AUTO CDC *is* the apply step.
2. **Slowly Changing Dimensions**: keep dimensions current (Type 1 today; Type 2 in Databricks Lakeflow).
3. **Materializing current-state from event streams**: order status, cart/session state, IoT device state, account balance, "latest value per entity" feature tables.
4. **Deletes & compliance**: GDPR erasure and hard deletes propagate via `apply_as_deletes`. Append/aggregate pipelines *can't* delete; CDC pipelines must.
5. **Deduplicating at-least-once streams**: keyed, sequenced upserts collapse Kafka redeliveries idempotently.

---

## What we ran: real scenarios, real data

Toy feeds prove syntax, not behavior. We ran AUTO CDC against a ghost-kitchen dataset: a **1.03M-event/day** order-lifecycle stream (`order_created → kitchen_started → … → delivered`) plus dimension tables, with a chaos generator that injects out-of-order and duplicate events. Two scenarios, both verified.

### Scenario 1: a live order-status board (the non-obvious one)

The realization: **the append-only lifecycle log is itself a change feed for one entity: the order.** Each event is a change to that order's current state. We projected the events into a CDC feed (`key = order_id`, `sequence_by = event time`, a cancellation = delete) and let AUTO CDC collapse it:

```
~128,000 CDC events  ->  4,691 rows in gold.orders_live   (one per live order)
308 cancelled orders removed via apply_as_deletes
current status:  delivered 4,601 | driver_ping 84 | driver_picked_up 1
cross-check vs an independent full recompute:  EXACT MATCH (0 rows differ)
```

The out-of-order events the generator injects are resolved by `sequence_by`, cancellations are gone, and the incremental output is **byte-for-byte identical to a full recompute**, but maintained incrementally instead of re-aggregating the entire history every refresh.

| | The naive way | With AUTO CDC |
|---|---|---|
| Cost per refresh | re-`GROUP BY` the *entire* event history | process only new events |
| Out-of-order events | "last event by arrival" is **wrong** | `sequence_by` → correct |
| Cancellations | can't express a delete in an append/aggregate | `apply_as_deletes` removes the row |
| Code | bespoke stateful `foreachBatch` + window dedup | 4 declarative lines |

### Scenario 2: operational dimension replication (the textbook one)

Ghost kitchens relocate, rename, and close. Streaming those changes as a CDC feed into `silver.dim_locations_current` as SCD Type 1:

```
{1: "San Francisco - SoMa", 2: "Los Angeles - Arts District", 4: "Austin"}
  - renames applied (ids 1, 2)
  - a closed kitchen (id 3) DELETED from the dimension
  - a stale, out-of-order edit to id 2 correctly ignored
```

The naive alternative (a nightly full reload) is stale up to 24 hours and re-copies every unchanged row, and it can't express the closure. AUTO CDC keeps the dimension minutes-fresh and propagates the delete.

Both current-state tables then feed ordinary `@dp.materialized_view` gold aggregations. AUTO CDC slots cleanly into the medallion architecture.

---

## Cases to be aware of

We put AUTO CDC through an adversarial battery. The good news: **SCD Type 1 is solid**: it passed every correctness case below. The value is in knowing *how* each case behaves.

**Upsert to a non-existent key → inserts.** An `UPSERT` for a key that was never inserted simply creates the row. (And a `DELETE` for a key that never existed is a clean no-op.) You don't need a separate "insert vs update" signal; that's what `keys` + the MERGE are for.

**Out-of-order updates → highest sequence wins.** This is the whole point of `sequence_by`. If `Boston (seq 3)` and a late-arriving `Chicago (seq 2)` both land for the same key, the row stays `Boston` regardless of arrival order, even across micro-batches, thanks to the durable aux state table.

**Cancellations / deletes → `apply_as_deletes`.** Model a terminal business event (an `order_cancelled`, a tombstone, a `DELETE` op) as the delete vector. The row is removed when that event is the key's latest. We drove this with *real* `order_cancelled` lifecycle events, and all 308 cancellations were removed correctly.

**Out-of-order deletes behave like any other event.** A `DELETE` at `seq 2` that arrives after an `UPDATE` at `seq 3` does **not** delete the row: the update is newer, so the row stays. Deletes win only when they're the highest sequence. Conversely, a stale `INSERT` (`seq 2`) arriving after a `DELETE` (`seq 5`) leaves the row deleted. Delete-before-insert across micro-batches is handled too.

**Re-inserts (resurrection) work.** `INSERT(seq1) → DELETE(seq2) → INSERT(seq3)` ends with the row **present** at the seq-3 value. A deleted key can come back.

**Null `sequence_by` fails loudly.** A null sequencing value aborts the micro-batch with `AUTOCDC_MICROBATCH_VALIDATION.NULL_SEQUENCE`. That's the right call: it refuses to guess rather than silently corrupting state. Make sure your sequence column is non-null.

**Ties on `sequence_by` are non-deterministic.** Two changes to the same key with the *same* sequence value resolve arbitrarily (last-writer-ish). Don't sequence on a coarse timestamp that can collide; use something strictly increasing per key, like a commit LSN or log offset. (In Scenario 1 we used `event_time * 100 + per_order_sequence` to guarantee uniqueness.)

**The target needs row-level MERGE *and* durability.** Parquet is rejected outright; use Iceberg/Delta. The aux state table must persist across streaming restarts, so an ephemeral catalog won't do.

**One sharp edge today:** on the build we tested (`master`, `5.0.0-SNAPSHOT`), running an AUTO CDC pipeline through the `spark-pipelines` **CLI** fails at registration with `InvalidPlanInput: RELTYPE_NOT_SET`, while driving the same graph programmatically against a standalone Connect server works. If you hit this, drive it via `create_dataflow_graph` + `start_run` for now. (Filed as a bug; it's specific to the CLI's embedded-server path, not the API.)

---

## Takeaways

- AUTO CDC turns "apply a change feed correctly" from a research project into four declarative lines, and it composes with the rest of your declarative pipeline.
- The hard cases that humans get wrong (out-of-order updates and deletes, resurrection, cross-batch dedup) are handled by the engine. We verified the output equals a full recompute on real, chaotic data.
- The things to get right are on *your* side of the contract: a **unique** `sequence_by`, a **MERGE-capable, durable** target, and a delete vector (`apply_as_deletes`) for the rows that should disappear.
- It's new. Build from `master` to try it, expect SCD Type 1, and watch the [release notes](https://spark.apache.org/news/) for it to land in a stable release.

*Further reading: the [companion guide](companion_guide_autocdc_scd1.md) (concepts + citations), the [hands-on demo](autocdc_scd1_demo.md), and the [real-world scenarios](autocdc_real_world_scenarios.md) with the full e2e.*
