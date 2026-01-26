+++
title = 'Action!'
date = '2026-01-10T13:00:53-08:00'
description = ""
link = ""
tags = []
categories = ["Physics"]
includes = []       # any javascript files to include
hasequations = true
tableofcontents = true
draft = true
+++


## Motivating problem

Optimization problems are extremely useful. In essence, an optimization problem is solved by finding the inputs that make the outputs reach an extreme value. For example, finding which speed (input) will minimize fuel consumption (output). Or finding the angle to throw a ball (input) to maximize its range (output).

Importantly, to optimize a function, two steps are needed:

1. Find the derivative.
2. Set the derivative to 0 and solve for the argument.

## Condition for optimality

If a problem can be posed as finding the minimum/maximum argument $x$ of a function and some parameters,

$$
y = f(x, \theta)
$$

Then, the function will have one extreme value $x=x_{ext}$ where $y(x) - y(x_{ext})$ has the same sign in the vicinity of $x_{ext}$. That is, all points around the extreme value are either larger (i.e. $x_{ext}$ is minimum) or smaller (i.e. $x_{ext}$ is maximum). That implies, that $f(x_{ext})$ does not change in that vicinity.

$$
\text{sign} \left(f(x) - f(x + \delta x)\right) = \text{sign} \left( f(x) - f(x - \delta x) \right)
$$

Making a linear approximation to predict how the function changes. Assuming a measurement of change in $x, y$ is available $\Delta x, \Delta y$ around $x$, then for a small pertubation of $\delta x$,

$$
\delta y = \frac{\Delta f(x)}{\Delta x} \cdot \delta x
$$

Then, $f(x +/- \delta x)$ is $f(x) +/- \frac{\Delta f(x)}{\Delta x} \cdot \delta x$. This implies that for the signs to be the same on both sides of $x$, \$\delta y$ and therefore $\frac{\Delta f(x)}{\Delta x}$ must be zero.

## Derivatives

More rigorously, calculus gives an easy way to find this optimum. The derivative of a function is the rate of change of output with respect to the change in input.

$$
\frac{d}{dx} y = \lim_{\delta x\rightarrow 0}\frac{f(x+\delta x) - f(x)}{\delta x}
$$

A derivative is a function too, and in shorthand called $y'=f'(x)$. A derivative of a derivative is $y''=f''(x)$. Expanding $y(x)$ using the [Taylor series](https://en.wikipedia.org/wiki/Taylor_series):

$$
f(x + \delta x) = f(x) + f'(x)\cdot \delta x + \frac{1}{2} f''(x) \cdot \delta x^2
$$

$\delta x^2$ becomes vanishingly small compared to $\delta x$ and that term can be discarded. Recall that the optimality condition is that the sign of $y(x + \delta x)$ should be the same in the vicinity of $x=x_{ext}$. For the sign to remain the same for both $+-\delta x$, it is necessary that $y'(x)\cdot \delta x=0$. And $\delta x$ is not zero. Therefore, for an optimum of a function, a necessary condition is:

$$
\frac{dy}{dx}=0
$$

So, the process to find an extreme value is:

1. Find the derivative.
2. Solve it for the input driving it to 0.

## Multivariate functions

The case for univariate functions can be extended to multivariate functions.

Multivariate functions are mappings from multiple inputs to outputs. Here, the input is ${x_1, x_2, ..., x_n}$ which can be represented as a vector $\vec{x}$.

$$
y = f(\vec{x}, \theta)
$$

Each input is an independent variable. $x_1$ can be speed, $x_2$ can be angle, $x_3$ can be height. That is, they are separate dimensions. In vector notation, the set of variables is a vector, which can be a sum of vectors along the basis dimensions ($\hat{x}_*$ is the unit vector):

$$
\vec{x} = \\{x_1, x_2, ..., x_n\\} = x_1 \hat{x_1} + x_2 \hat{x_2} + ... + x_n \hat{x_n}
$$

The derivative is found by:

$$
\frac{d}{d\vec{x}} y = \sum_i^n \lim_{\delta x_i\rightarrow 0}\frac{f(\vec{x}+\delta \hat{x_i}) - f(\vec{x})}{\delta \hat{x_i}}
$$

The definition of a multivariate derivative is:

$$
\frac{d}{d\vec{x}} y = \hat{x_1}\frac{\partial}{\partial x_1} y + \hat{x_2}\frac{\partial}{\partial x_2} y + ... \hat{x_n}\frac{\partial}{\partial x_n} y
$$

And the *variation* in the function is:

$$
dy = \sum_i^n \hat{x_i}\frac{\partial}{\partial x_i} y \cdot dx_i
$$

Like, before an optimum is found where the derivative $y'$, and therefore the variation in the function $dy$, is zero. In this case, the derivative is a vector. A vector being zero means all elements are zero. Therefore there are $n$ simultaneous equations that can be solved for each variable in $\vec{x}$:

$$
\begin{bmatrix}
{\frac{dy}{dx_1}} \\\\
{\frac{dy}{dx_2}} \\\\
{\vdots} \\\\
{\frac{dy}{dx_n}} \\\\
\end{bmatrix} =
\begin{bmatrix}
{0} \\\\
{0} \\\\
{0} \\\\
{0} \\\\
\end{bmatrix}
$$

## Functionals

Extending multivariate functions by making two assumptions:

1. A function may map infinitely many inputs to outputs, that is the size of $\vec{x}$ is $\infty$.
2. The inputs are related to one another. That is, it makes sense to add $x_1$ to $x_2$. Adding a distance to a distance works, unlike adding a distance to a speed.

In this case, $x_1, x_2, ...$ are placed infinitisimally close to each other. So much so, that they form a continuous line which could be parametrized over an interval $t \in [a,b]$:

$$
\vec{x} = \\{x_1, x_2, ..., x_\infty\\} = \\{x_i: x_i = g(t), t \in [a, b]\\}
$$

The function $y = f(x, \theta)$ to be optimized still depends on multiple inputs. In this case, there are infinite variables which have the same units and can be strung together by a function. The goal now is to find this parametric description of all the variables, rather than solving for the variables individually in a system of equations.

$$
y = f(g(t), \theta)
$$

Here, $y$ is a function *of* a function. This is called a functional. A functional is extreme around input values described by $g_{ext}(t)$, if $f[g(t)]-f[g_{ext}(t)]$ have the same signs for all $g$ in the vicinity of $g_{ext}$.

A functional derivative is the sum of infinitely many derivatives evaluated at points infinitisimally close. Each partial derivative about $\vec{x}$ is calculated by adding a perturbation to the $i^{th}$ dimension $\delta x_i$

$$
\frac{dy}{d g(t)}  = \frac{dy}{d \\{x_1, x_2, ..., x_\infty\\}} = \sum_i^\infty \frac{dy}{dx_i} = \sum_i^\infty \lim_{\delta x_i\rightarrow 0}\frac{f(\vec{x}+\delta \hat{x_i}) - f(\vec{x})}{\delta \hat{x_i}}
$$

This can be parametrized as a function:

$$
\frac{dy}{d g(t)} = \sum_{t=a}^{t=b}\lim_{\delta g(t)\rightarrow 0} \frac{f(g(t) + \delta g(t)) - f(g(t))}{\delta g(t)}
$$

Where $\delta g(t)$ is a small change in $g(t)$, a small perturbation for each of the points along the line. It can be represented as $\epsilon \cdot \eta(t)$, where $\eta(t)$ is a parametric line and $\epsilon$ indicates a small addition of it to $g(t)$. Therefore the limit becomes:

$$
\frac{dy}{d g(t)} = \sum_{t=a}^{t=b} \lim_{\epsilon \rightarrow 0} \frac{f(g(t) + \epsilon \cdot \eta(t)) - f(g(t))}{\epsilon}
$$

The argument of the integral is the definition of the partial derivative:

$$
\frac{dy}{d g(t)} = \sum_{t=a}^{t=b} \frac{\partial y}{\partial g(t)}
$$

Noting that an optimum is found when a derivative is zero, the following observations can be made: the sum can be multiplied by a constant, without changing the solution.

$$
\arg_{g(t)} \frac{dy}{d g(t)} = 0 \leftrightarrow \arg_{g(t)} \epsilon \cdot \frac{dy}{d g(t)} = \epsilon \cdot 0
$$

The multiplier can be made $\epsilon = \delta t$, a smal interval of the parameter describing inputs. Then, the functional derivative becomes:

$$
\frac{dy}{d g(t)}  = \sum_{t=a}^{t=b} \frac{1}{\delta t} \frac{\partial y}{\partial g(t)} \cdot \delta t
$$

Which, as $\lim_{\delta t \rightarrow 0}$, infinitisimally close infinitely many points, can be substituted for with an integral. The *variation* becomes:

$$
dy = \int_{t=a}^{t=b} \left.\frac{\delta y}{\delta g(t)}\right|_{t} dt\\;dg(t)
$$

{{<aside "Examples of partial derivatives">}}

A functional that evaluates its argument at $3$ and squares it:

$$
\\begin{align*}
y &= f(g(t)) \rightarrow g(3)^2 \\\\
& : f(\sin(t)) \rightarrow \sin^2 (3) \\\\
& : f(t^3) \rightarrow (3^3)^2 \\\\
\therefore \frac{\partial y}{\partial g(t)} &= 2 g(t)
\\end{align*}
$$

A functional that integrates its argument over the domain:

$$
\begin{align*}
y &= f(g(t)) \rightarrow \int g(t) dt \\\\
&: f(\sin(t)) \rightarrow \int \cos(t) dt \\\\
\therefore \frac{\partial y}{\partial g(t)} &= \frac{y + dy/dg \cdot \delta g - f}{\delta g} = \frac{\ + }{}
\end{align*}
$$
{{</aside>}}

## The Euler-Lagrange Equation

Assuming a function is of the  form (notation taken from Physics):

$$
F[y] = \int L(x, y, y')
$$

The functional derivative can be solved to give a readily useful identity.

## Examples

## Read more

- [Notes on Functionals](http://julian.tau.ac.il/bqs/functionals/functionals.html)
- 
