+++
title = "Story demo (placeholder)"
date = '2026-10-26T12:00:00-05:00'
description = "Demonstrates a narrative woven with the Filasteen timeline. Placeholder text."
categories = ["History"]
tags = []
draft = true

[geotimeline]
src = "/post/filasteen/timeline.yaml"   # the dataset lives in the filasteen bundle
now = "2023-10-07"
modes = ["woven", "story", "timeline"]
default = "woven"
converge = true
cutback_stubs = true
events = ["story.timeline"]              # this story's own moments
+++

*This draft demonstrates the story mechanic. The narrative is placeholder
text, not reporting; replace it, and this page, as you see fit.*

{{% story %}}

## Rafah, October 2023 {data-where="31.2969,34.2455" data-name="Rafah" data-region="levant" data-when="2023-10-09"}

Amal is nine. She keeps her school shoes by the door, laces tied, in case
they have to leave at night. Her grandmother keeps something else by the
door: an iron key to a house in [Jaffa](#e=1948-05-13-in-jaffa-50-000-palestinians)
that no one in the family has seen in seventy-five years.

{{% woven %}}
To understand the key, we have to go back further than the house.
{{% /woven %}}

{{% cutback from="1878" to="1917" title="A land, before the Mandate" max=8 %}}

## The key {data-when="2023-10-14"}

Her grandmother tells it the same way every time: the orange groves, the
sea, the night the trucks came. Amal has heard it so often she can recite
the street names. The [Balfour Declaration](#e=1917-11-02-balfour-declaration-issued)
is not part of the story, but it is in every version of it.

{{% cutback events="1922-07-24-mandate-for-palestine, 1947-11-29-un-partition-plan, 1948-05-14-declaration-of-independence" title="From Mandate to partition" %}}

## South {data-where="31.3462,34.3063" data-name="Khan Yunis" data-region="levant" data-when="2023-10-28"}

The family walks south with what they can carry. Amal carries the shoes.
Her grandmother carries the key.

{{% cutback from="1948-03" to="1948-05" actors="haganah" max=8 more="See every event of the 1947–49 war" %}}

## Now {data-where="31.2969,34.2455" data-name="Rafah" data-region="levant" data-when="2023-11"}

{{% cutback from="1949" to="now" converge=true title="To the present" %}}

{{% woven %}}
The road from the orange groves to the tent in Rafah is not a straight line,
but every step of it is on the map.
{{% /woven %}}

{{% /story %}}
