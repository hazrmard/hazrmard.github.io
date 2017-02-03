---
title: Talking With Satellites
author: ahmedi
layout: post
date: 2015-10-14T19:16:21+00:00
categories:
  - Engineering
  - Personal
format: link
hasequations: false
hascode: false
---
This year I am leading a senior design team in developing a
software defined radio that can talk with a satellite that
[Vanderbilt just launched](http://www.amsat.org/?p=3689).
Compared to a normal radio, an SDR has most of the signal
processing functions implemented virtually. This means that
it can change its operation on the fly. An interesting
application of SDRs is cognitive radio: that is, radios
communicating with other radios in their vicinity and
adjusting their frequencies to maximize their use of the
bandwidth.

<figure>
    <img src="/img/posts/cubesat.gif">
    <figcaption>A CubeSat</figcaption>
</figure>

Our project involves integrating an SDR with a satellite
tracking antenna system, processing the signal and passing
it on to a satellite specific application to decrypt it. If
we are successful, we will not only be able to talk to our
own CubeSat, but have a chat with astronauts abroad the
International Space Station. How cool is that!
