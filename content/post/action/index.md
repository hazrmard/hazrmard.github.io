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

If a problem can be posed as finding the minimum/maximum argument $x$ of a function,

$$
y(x) = f(x, \theta)
$$

Then, the function will have one extreme value $x=x_{ext}$ where $y(x) - y(x_{ext})$ has the same sign in the vicinity of $x_{ext}$. That is, all points around the extreme value are either larger (i.e. $x_{ext}$ is minimum) or smaller (i.e. $x_{ext}$ is maximum).

## Derivatives

Calculus gives us an easy way to find this optimum. The derivative of a function is the rate of change of output with respect to the change in input.

$$
\frac{d}{dx} y = \lim_{x\rightarrow 0}\frac{f(x+\delta x) - f(x)}{\delta x}
$$

This works when we want to find a single value that minimizes a function. What happens if we want find multiple values that minimize a function? For example, what is the *angle* and *speed* that a thrown ball will take, maximizing range?

## Multivariate functions

Multivariate functions are mappings from multiple inputs to outputs. Here, the input is ${x_1, x_2, ..., x_n}$ which can be represented as a vector $\vec{x}$.

$$
y = f(\vec{x}, \theta)
$$

Each input is its own, independent thing. $x_1$ can be speed, $x_2$ can be angle, $x_3$ can be height. That is, they are separate dimensions. The derivative is found by:

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

Like, before an optimum is found where the derivative is zero. An example problem could be: given some energy budget (kinetic+potential), what is the optimal height, angle, and speed to throw the ball with to ensure maximum range.

## Functionals

Extending multivariate functions by making two assumptions:

1. A function may map infinitely many inputs to outputs, that is the size of $\vec{x}$ is $\infty$.
2. The inputs are related to one another. That is, it makes sense to add $x_1$ to $x_2$. Adding a distance to a distance works, unlike adding an angle to a speed.

For example, the location of a ball at each point in time to ensure maximum range. A problem could be: given some energy budget (kinetic+potential), what is the trajectory of the ball which maximizes its range?

In this case, $x_1, x_2, ...$ are placed infinitisimally close to each other. So much so, that they form a continuous line which could be parametrized over an interval $t \in [a,b]$:

$$
\vec{x} = {x_1, x_2, ..., x_\infty} = g(t)
$$

The function $y = f(x, \theta)$ to be optimized still depends on multiple inputs. The goal now is to find this parametric description of all the points, rather than solving for the points individually in a system of equations.

$$
y = f(g(t), \theta)
$$

Then

$$
\frac{dy}{d {x_1, x_2, ..., x_n}} = \sum_i^n \frac{dy}{dx_i}
$$

Which, for infinitely many values, infinitisimally close, can be substituted for with an integral:

$$
\frac{dy}{d g(t)} = \int_{t=a}^{t=b} \frac{dy}{d g(t)} = \int_a^b \frac{dy}{dx} \frac{dx}{dt} dt
$$

The problem seeks to optimize the range with respect to infinitely many variables which are related to each other. While each location in time is its own variable, the trajectory could be explained by a function. Therefore, instead of solving a system of equations for each location, can the derivative be solved for a function that describes all such locations?

A functional is a function of a function, $J[y]$. It maps a function, $y$ to a scalar. A functional is extreme around some value $y=f$, if $J[y]-J[f]$ have the same signs for all $y$ in the vicinity of $f$.

## The Euler-Lagrange Equation

## Examples

## Read more

- [Notes on Functionals](http://julian.tau.ac.il/bqs/functionals/functionals.html)
- 
