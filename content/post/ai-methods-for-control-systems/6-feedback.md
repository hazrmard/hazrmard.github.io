+++
title = 'Feedback control'
date = '2018-10-29T11:37:39-05:00'
description = ""
tags = ["matlab", "control systems"]
categories = ["engineering"]
series = ["AI methods for control systems"]
isexternal = false
hasequations = true
hascode = true
includes = []
draft = false
+++

## A unifying approach

Both modern and classical system representations can be viewed homogenously. Recall that classical methods map inputs to outputs via a transfer function. Moden approaches define state variables describing the internal system dynamics which are then used to compute system output.

$$
y(t) = \mathcal(L)^{-1} \left{ H(s) X(s) \right}
$$

<div>$$
\begin{align*}
x'(t) &= Ax(t) + Bu(t)  \\
y(t) &= Cx(t) + Du(t)
\end{align*}
$$</div>

{{< figure src="/img/posts/ai-methods-for-control-systems/6-unified.png" caption="A unified view of classical and modern representations. The transfer function obscures internal dynamics of the system whereas modern state space models expose internals.">}}

## Feedback

So far, the two approaches explained can describe dynamics of a system: how an input affects the system response. Whether via a transfer function or state matrices. To achieve the desired response, we will solve the transfer function or state equations for input. Controlling by mapping input to an output is called **open-loop control**.

{{< figure src="/img/posts/ai-methods-for-control-systems/6-open-loop.png" >}}

However, real-world systems rarely are so static. The theoretical response may not match exactly with the one in practice. Using a pre-computed control input may build up errors over time and cause the system to go out of bounds.

This is where feedback comes in. Feedback continuously compares the system output/state to the reference input. The difference is called the *error*. The error is then fed to the system. This supervised control is known is **closed-loop control**.

{{< figure src="/img/posts/ai-methods-for-control-systems/6-closed-loop.png" >}}

[1]: http://ctms.engin.umich.edu/CTMS/index.php?example=Introduction&section=ControlStateSpace