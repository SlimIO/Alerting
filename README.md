# Alerting
SlimIO - Alerting Addon. This addon is responsible for all complicated Alerting mechanism.

## Features

- Alert in case of rafale (or storm).
- Alert on different metric(s) threshold.
- Alert on Entities (descriptors, if they are here etc..).

> ⚠️ This addon pull and create alarms in **Events** addon.

## Getting Started
This package is available in the SlimIO Package Registry and can be easily installed with [SlimIO CLI](https://github.com/SlimIO/CLI).

```bash
$ slimio --add alerting
# or
$ slimio --add https://github.com/SlimIO/Alerting
```

> Note: this addon is automatically installed with the slimio -i command.

## Dependencies

|Name|Refactoring|Security Risk|Usage|
|---|---|---|---|
|[@slimio/addon](https://github.com/SlimIO/Addon#readme)|⚠️Major|Low|Addon default class|
|[@slimio/alert](https://github.com/SlimIO/Alert#readme)|⚠️Major|Low|Create alerts|
|[@slimio/timemap](https://github.com/SlimIO/TimeMap#readme)|⚠️Major|Low|Time Map|

## Licence
MIT
