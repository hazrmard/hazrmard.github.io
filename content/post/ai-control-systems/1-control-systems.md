+++
title = 'Control Systems: Overview'
date = '2018-09-10T11:34:21-05:00'
description = "A primer for classical control theory."
tags = ["matlab"]
categories = ["engineering"]
series = ["AI methods for control systems"]
isexternal = false
hasequations = true
hascode = false
includes = []
draft = true
+++

## Overview of control theory

A control system is a mechanism that dictates the behaviour of another system. A controller relies on signals it can measure to estimate performance of the system. In response it sends out signals that influence the system towards the desired state.

A controller is designed by modelling a system as a set of differential equations in time. By analysing that model, a control strategy can be developed. There are two approaches to solving systems modelled as differential equatiosn:

* **Classical** methods use various transforms (Laplace, Fourier) to convert the set of equations from the time domain into the frequency domain. This can bybass many complications of handling derivatives and integrals.

* **Modern** methods simply a higher order differential equation into a set of lower order differential equations which can be manipulated more easily. These sets of equations are called *State equations*.

Alternatively, the field of control systems can be divided by features or restrictions present in systems:

* **Robust** control attempts to acount for inherent inaccuracies an uncertainties in measurement of signals in the systemm.

* **Adaptive** control tries to evolve its control strategy as the characteristics of the system change over time which renders a static system model useless.

* **Optimal** control uses some measure to *evaluate* the state of a system. It tries to maximize that value over time.

* **Non-linear** control wrestles with systems that cannot be modelled as linear differential equations and so do not lend themselves to a host of methods applicable to solving linear equations.

Yet another way to divide control theory is in how systems are modelled in time:

* **Continuous** systems vary smoothly as time increases. This is the default assumption when modelling systems in control theory as differential equations and transforms are indended for continuous variables.

* **Discrete** systems vary in time steps. This means there are discontinuities in the system model (infinite gradients etc.). For these class of systems, the *z-transform* can be used to represent them in a more continuous-friendly form.

## What is a system?

A system is any mechanism that takes an input and produces an output. How systems operate in inputs to produce an output or a response distinguishes them.

### LTI Systems

A class of systems convenient to work with is called **Linear Time Invariant (LTI)** systems. Such systems satisfiy two properties:

#### Linearity

A linear system is one where the response scales or accumulates as the inputs scale or accumulate. There are two criteria for linearity:

* **Additivity**: The sum of outputs of two inputs is the same as the output of the sum of two inputs. Mathematically, if $y$ is the system function, and $x_1$ and $x_2$ are inputs, then:

$$
y(x_1 + x_2) = y(x_1) + y(x_2)
$$

* **Homogeneity**: If the input scales by a factor $k$, then the output scales by the same factor:

$$
y(k \cdot x) = k \cdot y(x)
$$

#### Time-invariance

A time-invariant system does not change its response to the same output at different times. This means that the system output is purely a function of the input and not of time.

A time-invariant system:

$$
y(x(t)) = 3 \cdot x(t)^2 + x(t)
$$

A time-variant system:

$$
y(x(t)) = t \cdot x(t)
$$

### System attributes

#### Stability

A stable system is one where in response to a bounded input, the output is also bounded. For example, a system susceptible to resonance frequencies will be unstable.

#### Initial time

The initial time of a system is before which there was no input.

#### Steady state response

The steady state response of a system is the output when the system has settled in response to inputs. It is defined as the output as $t \rightarrow \infty$. There are several parameters that describe the temporal behaviour of the system:

* **Step response** is the output of the system in response to a constant $1$ input starting at initial time.

* **Target value** is the output desired from a given input.

* **Rise time** is the time taken to get within a margin of the target value for the first time.

* **Percent overshoot** is how much the response overcompensated relative to the target value.

* **Steady state error** is the final, constant error of the response as $t \rightarrow \infty$.

#### Order

The order of a system is a representation of its complexity. It can be denoted by various properties depending on the formulation of the system:

* The highest exponent in the Laplace domain,
* Number of variables in state space equations (see Modern control methods),
* Number of energy storage elements in the model (e.g capacitors, inductors, not resistors).