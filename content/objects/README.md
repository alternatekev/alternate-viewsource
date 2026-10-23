# content/objects/

Evidence a chapter picks up: one folder per object, named `<topic>-<what>`. Each folder holds either an `object.json` (a document or a chart: `kind`, `title`, `date`, `phase`, `caption`, `sources`, and the `file` it points at, with `columns` or `method` where a chart needs them) or a `manifest.json` (`kind: screenshots` or `kind: video`, with a `files` list of `file`, `date`, `caption`, `source`, and `poster` for a video). Images are web-sized copies; originals stay where they were taken. Captions name what is in the frame and where it came from; they never speak for the author.

The `sim-racing-*` folders are the evidence for the agents phase's sim-racing chapter: a compiled record, the commit cadence, a telemetry sample, and dated screenshots of the rig, the HUD, the tracks and the liveries.

The `viewsource-*` folders are the evidence for the chapter about this site: the build cadence from this repository's own history, and the lineage of what the site borrowed and from when.
