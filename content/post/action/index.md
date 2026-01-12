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

Finding extreme values is extremely useful. For example, finding which shape dimensions will maximize volume inside a surface area. Or finding the angle to throw a ball to maximize its range.

## Derivatives

Calculus gives us an easy way to solve this. If a problem can be posed as finding the minimum argument $x$ of a function,

$$
y(x) = f(x, \theta)
$$

Then, the function will have one extreme value $x=x_{ext}$ where $y(x) - y(x_{ext})$ has the same sign in the vicinity of $x_{ext}$. That is, all points around the extreme value are either larger (i.e. $x_{ext}$ is minimum) or smaller (i.e. $x_{ext}$ is maximum). In other words, close to $x_{ext}$, the function $y$ stops changing.

y = f(x + d.x)

$$
\frac{\partial}{\partial x} y = 0
$$

This works when we want to find a single value that minimizes a function. What happens if we want find multiple values that minimize a function? For example, what is the *path* that a thrown ball will take, maximizing range?

## Functionals

A functional is a function of a function, $J[y]$. It maps a function, $y$ to a scalar. A functional is extreme around some value $y=f$, if $J[y]-J[f]$ have the same signs for all $y$ in the vicinity of $f$.

## The Euler-Lagrange Equation

## Examples

## Read more

- [Notes on Functionals](http://julian.tau.ac.il/bqs/functionals/functionals.html)
- 
