+++
title = 'Modern control: Solutions & state transition matrices'
date = '2018-09-24T14:17:46-05:00'
description = ""
tags = ["matlab", "control systems"]
categories = ["engineering"]
series = ["Control systems"]
isexternal = false
hasequations = true
hascode = true
includes = []
draft = true
+++

The state equation for a linear time-invariant system:

$$
x'(t) = A x(t) + B u(t)
$$

Can be solved for $x(t)$. We collect all terms in $x$:

$$
x'(t) - A x(t) = B u(t)
$$

Multiply equation by $e^{-At}$

$$
x'(t) e^{-At} - A x(t) e^{-At} = B u(t) e^{-At}
$$

Using product rule $d(f\;g) = f\;dg + g\;df$, where:

<div>$$
\begin{align*}
df = - A e^{-At}   \rightarrow & f = e^{-At}    \\
dg = x'(t)         \rightarrow & g = x(t)  \\
\\
\therefore x'(t) e^{-At} - A x(t) e^{-At} &= d (e^{-At} x(t))
\end{align*}
$$</div>

To give:

$$
\frac{d}{dt} (e^{-At} x(t)) = B u(t) e^{-At}
$$

Which can be integrated on the limits $t = t_0 \rightarrow t$:

<div>$$
\begin{align*}
e^{-At} x(t) \rvert_{t_0}^{t} &= B \int_{t_0}^{t} u(t) e^{-At} \; dt   \\
e^{-At} x(t) &= e^{-At_0} x(t_0) + B \int_{t_0}^{t} u(t) e^{-At} \; dt
\end{align*}
$$</div>

The solution to the state equation is:

{{% outlined %}}
<div>$$
x(t) = e^{A(t-t_0)} x(t_0) + B e^{At}  \int_{t_0}^{t} u(t) e^{-At} \; dt
$$</div>
{{% /outlined %}}

This can be plugged into the output equation to compute system outputs.

## State transition matrix

The term $e^{At}$ is called the state transition matrix. It is an exponental of the system matrix which relates the change in state to the current state. The exponential can be calculated in several ways through Taylor series expansion an inverse laplace transform, spectral decomposition, or the Cayley-Hamilton theorem.

In MatLab:

```matlab
A = [1 2; 3 4]      % A is some matrix
t = sym('t')        % create symbol
eAt = expm(A * t)   % compute exponential
```

For the case of time-varying systems, the state transition matrix is not a simple exponential but a function $\phi(t, t_0)$ unique to the system. The general solution of the state equation for time-varying systems becomes:

<div>$$
x(t) = \phi(t, t_0) x(t_0) + \int_{t_0}^{t} \phi(t, t_0) B(t) u(t) \; dt
$$</div>

More details on the general solution can be found in the [WikiBook][1].

## Example - spring mass system

Using the matrices found in the [last post][2], we have the state space matrices:

<div>$$
A = 
\begin{bmatrix}
    0                   &   1       \\
    \frac{-k}{m} &   \frac{-a}{m}
\end{bmatrix},
B = 
\begin{bmatrix}
    0  \\
    \frac{1}{m}
\end{bmatrix},
C =
\begin{bmatrix}
    1                   &   0
\end{bmatrix},
D = 
\begin{bmatrix}
    0
\end{bmatrix}
$$</div>

Making some assumptions for the constants, we can define the matrices in MatLab:

```matlab
m = 10;                 % setting constants
k = 2;
a = 3;

A = [0 1; -k/m -a/m];   % defining state-space matrices
B = [0; 1/m];
C = [1 0];
D = [0];

sys = ss(A, B, C, D);   % defining the system
```

### Impulse response

Using the matlab command, we get:

```matlab
impulseplot(sys, 10)
```

{{< figure src="/img/posts/ai-methods-for-control-systems/5-spring-impulse.png" >}}

### Impulse response

Using the matlab command, we get:

```matlab
stepplot(sys, 10)
```

{{< figure src="/img/posts/ai-methods-for-control-systems/5-spring-step.png" >}}

[1]: https://en.wikibooks.org/wiki/Control_Systems/Time_Variant_System_Solutions
[2]: {{< ref "4-modern-state-space-equations.md" >}}
