+++
title = 'Control Systems 2: Transforms'
date = '2018-09-10T13:13:41-05:00'
description = ""
tags = ["matlab"]
categories = ["engineering"]
series = ["AI methods for control systems"]
isexternal = false
hasequations = true
hascode = false
includes = []
draft = true
+++

Classical control methods simplify handling of a complex system by representing it in a different domain. The equations governing system dynamics are *transformed* into a different set of variables. A for a function $f(t)$ in the $t$ domain, an oft used transformation is of the form:

$$
\mathcal{T}(f(t)) = F(s) = \int_Domain f(t) \cdot g(s, t) dt
$$

Mathematically, the integral removes the $t$ variable and only leaves $s$, thus converting from the $t$ domain to the $s$ domain. Conceptually, along each point in the $t$-domain, the function in the $s$-domain $g(s, t=t)$ is scaled by the value of $f(t)$ at that point. The scaled curves ($f(t=1) \cdot g(s,t=1), $f(t=2) \cdot g(s,t=2)) are all summed up leaving an aggregate function in $s$, $F(s)$ that is the sum of *weighed* contributions of $f(t)$. So if the original function was not in a palatable form, perhaps the transform - which encodes $f$ - may yeild a better representation.
