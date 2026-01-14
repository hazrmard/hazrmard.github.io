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
\frac{d}{dx} y = \limit_{x\rightarrow 0}\frac{f(x+\delta x) - f(x)}{\delta x}
$$

This works when we want to find a single value that minimizes a function. What happens if we want find multiple values that minimize a function? For example, what is the *path* that a thrown ball will take, maximizing range?

## Multivariate functions

## Functionals

A functional is a function of a function, $J[y]$. It maps a function, $y$ to a scalar. A functional is extreme around some value $y=f$, if $J[y]-J[f]$ have the same signs for all $y$ in the vicinity of $f$.

## The Euler-Lagrange Equation

## Examples

## Read more

- [Notes on Functionals](http://julian.tau.ac.il/bqs/functionals/functionals.html)
- 
