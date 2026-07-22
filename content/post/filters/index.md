+++
title = 'Filters'
date = '2026-01-10T13:02:12-08:00'
description = "Notes on Kalman and Bayesian filtering: the predict-update cycle used to estimate a system's state from noisy measurements."
link = ""
tags = []
categories = ["Engineering"]
includes = []       # any javascript files to include
hasequations = true
tableofcontents = false
draft = true
+++

## Helpful links

https://www.cs.unc.edu/~welch/media/pdf/kalman_intro.pdf
https://github.com/rlabbe/filterpy
https://github.com/rlabbe/Kalman-and-Bayesian-Filters-in-Python/

All filters have two steps:

1. Prediction. The the next state is predicted.
2. Update. After measurement, a new state estimate is calculated.

## Notation

$z$ measurement output, the *likelihood*
$x$ state of system
$\bar{x}$ is the *prior*, prediction of state
$\hat{x}$ is state estimate, the *posterior*, given measurement (evidence) and prediction (belief)
$F$ is the fundamental matrix, such that $x_{t+1}\gets F x_t$.
$x'$ is the rate of change of state

## A simple filter

Given, an estimate of state, a prediction of how the state will change, and a measurement of the state, new estimates can be calculated. Where $x_{t+1}$ is the predicted state of the system:

Predict:

$$
\bar{x}_{t+1} \gets \hat{x}_t + x'dt
$$
Update:
$$
\hat{x}_{t+1} \gets \bar{x}_{t+1} + \alpha (z-\bar{x}_{t+1})
$$
Where $\alpha$ is some measure of *likelihood*, i.e. how likely is the measurement $z$ given the prediction, and how much we should trust it.

## Learning $x'$

Another weight can be incorporated to learn $x' \gets x' + \beta (z-x)/dt$ as part of the update step. That is, the measured and predicted state influence how the estimated $x'$ will change.

## Using probabilities


## Using Gaussians for prediction and measurement

Addition (when predicting, $\bar{x} \gets \hat{x} + x'dt$, where $\hat{x},x'$ are gaussians):
$\mathcal{N}(\mu_1,\sigma_1^2) + \mathcal{N}(\mu_2,\sigma_2^2) = \mathcal{N}(\mu_1+\mu_2,\sigma_1^2+\sigma_2^2)$ 

Multiplication

In literature:
x: estimated state,
P: state variance, uncertainty in current state
u: change in state from process (x'dt)
Q: process variance, i.e. uncertainty in dx/dt
z: measurement
R: measurement variance i.e. uncertainty in z (output)
h($\bar{x}$): measurement function
H: jacobian of measurement function

## Tips

Do not lie to the filter. For e.g. a small process noise, when the process is actually changing, will make the filter ignore changes, because it is certain it it's current process estimate.
A bad initial estimate will take time to correct. Instead, use the first measurement as the initial state estimate.