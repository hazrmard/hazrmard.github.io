+++
title = 'WIP'
date = '2025-12-26T14:57:29-06:00'
description = "History in context"
link = ""
tags = []
categories = ["History"]
includes = []       # any javascript files to include
hasequations = false
tableofcontents = false
draft = true

# A story woven with the timeline (see geotimeline/README.md, "Story pages").
[geotimeline]
src = "timeline.yaml"
now = "2023-10-07"                      # TODO: the story's present
modes = ["woven", "story", "timeline"]
default = "woven"
converge = true
cutback_stubs = true
events = ["story.timeline"]             # the story's own moments
+++

{{% story %}}

## Placeholder: the present {data-where="gaza" data-when="2023-10-07"}

*Placeholder story text.* Open on the contemporary event: who, where, what
the reader should feel. Mention history only through links, such as the
[UN Partition Plan](#e=1947-11-29-un-partition-plan).

{{% woven %}}
*Placeholder bridge:* one sentence that hands the reader to the past.
{{% /woven %}}

{{% cutback from="1878" to="1917" title="Before the Mandate" max=10 %}}

## Placeholder: back to the present {data-when="2023-10-14"}

*Placeholder story text.* The story continues, or a second narrator.

{{% cutback from="1918" to="1946" title="The Mandate years" max=10 %}}

## Placeholder: the story moves {data-where="jerusalem" data-when="2023-10-28"}

*Placeholder story text.*

{{% cutback from="1947-11" to="1949-07" title="1947–1949" max=12 %}}

## Placeholder: now {data-where="gaza" data-when="2023-11"}

*Placeholder story text.* Where the story stands today.

{{% cutback from="1949-08" to="now" converge=true title="To the present" %}}

{{% woven %}}
*Placeholder closing:* the timeline and the story meet here.
{{% /woven %}}

{{% /story %}}
