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
y(x) = f(x, \theta)
$$

Then, the function will have one extreme value $x=x_{ext}$ where $y(x) - y(x_{ext})$ has the same sign in the vicinity of $x_{ext}$. That is, all points around the extreme value are either larger (i.e. $x_{ext}$ is minimum) or smaller (i.e. $x_{ext}$ is maximum).

## Derivatives

Calculus gives us an easy way to find this optimum. The derivative of a function is the rate of change of output with respect to the change in input.

$$
\frac{d}{dx} y = \lim_{x\rightarrow 0}\frac{f(x+\delta x) - f(x)}{\delta x}
$$

A derivative is a function too, and in shorthand called $y'(x)$. A derivative of a derivative is $y''(x)$. Expanding $y(x)$ using the [Taylor series](https://en.wikipedia.org/wiki/Taylor_series):

$$
y(x + \delta x) = y(x) + y'(x)\cdot \delta x + \frac{1}{2} y''(x) \cdot \delta x^2
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
\frac{d}{d\vec{x}} y = \sum_i^n \lim_{x_i\rightarrow 0}\frac{f(\vec{x}+\delta \hat{x_i}) - f(\vec{x})}{\delta \hat{x_i}}
$$

Basically:

$$
\frac{d}{d\vec{x}} y = \hat{x_1}\frac{d}{dx_1} y + \hat{x_2}\frac{d}{dx_2} y + ... \hat{x_n}\frac{d}{dx_n} y
$$

$$
dy = \sum_i^n \hat{x_i}\frac{d}{dx_i} y \cdot dx_i
$$

Like, before an optimum is found where the derivative is zero. In this case, the derivative is a vector. A vector being zero means all elements are zero. Therefore there are $n$ simultaneous equations that can be solved for each variable in $\vec{x}$:

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

Here, $y$ is a function *of* a function. This is called a functional. A functional is extreme around some value $g_{ext}(t)$, if $f[g(t)]-f[g_{ext}(t)]$ have the same signs for all $g$ in the vicinity of $g_{ext}$.

A functional derivative is

$$
\frac{dy}{d \\{x_1, x_2, ..., x_n\\}} = \sum_i^n \frac{dy}{dx_i}
$$

This infinite sum is along a series of points $\delta x$ apart, where $\delta x$ approaches 0.

Which, for infinitely many values, infinitisimally close, can be substituted for with an integral:

$$
\frac{dy}{d g(t)} = \int_{t=a}^{t=b} \frac{dy}{d g(t)} dt
$$

The problem seeks to optimize the range with respect to infinitely many variables which are related to each other.

A functional is a function of a function, $J[y]$. It maps a function, $y$ to a scalar.

## The Euler-Lagrange Equation

## Examples

## Read more

- [Notes on Functionals](http://julian.tau.ac.il/bqs/functionals/functionals.html)
- 
