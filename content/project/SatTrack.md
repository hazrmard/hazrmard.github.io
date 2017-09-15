+++
isexternal = false
image = "/img/projects/SatTrack.gif"
link = "https://github.com/hazrmard/SatTrack"
date = "2016-04-01T00:00:00-06:00"
description = "Real-time satellite tracking interface."
title = "SatTrack"
hasequations = false
hascode = false
+++

SatTrack is the software-side of my senior engineering project at Vanderbilt
University. I led a team of 4 students to design a software-defined radio system
that can track and receive scientific data from cube satellites.

<figure>
    <img src="/img/projects/SatTrack_poster.png">
    <figcaption>Poster for the project.</figcaption>
</figure>

_SatTrack_ provides the front/back end of the entire interface. The software
can be run from any system that supports Python. It calculates satellite position
in real-time based on current location. There is a companion module on an Arduino
which controls antenna servos using those coordinates.

_SatTrack_ can be used in a python script for flexibility. It comes with a
very convenient graphical interface hosted on a browser that can be served on a
local network. So you can control the whole system from your smartphone from a
distance.

A demo of the interface on a computer:
{{< youtube AYTlRSY0r2I >}}

The interface on a mobile device:

{{< youtube QayhI7FTyIs >}}
