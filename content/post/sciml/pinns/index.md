+++
title = 'Physics-Informed Neural Networks (PINNs)'
date = '2025-01-05T11:44:46-06:00'
description = ""
tags = []
categories = []
link = ""
hasequations = false
includes = []       # any javascript files to include
tableofcontents = false
draft = true
+++

## Neural Networks are black boxes

- Function approximators
- Try to minimize a cost function blindly
- However, garbage in, garbage out
- This may work for interpolating
- Extrapolation is out of domain

## How we inform a Neural Network

- May work for interpolating, not always
- Occam's razor - perhaps a simpler explanation is better
- We use regularization

## Using physics as information

- Regularization is a penalty informed by model architecture
- Can we add another penalty informed by data domain?

## References

https://arxiv.org/pdf/2308.04073

- PINNs are sensitive to choice of activation functions. They provide a learnable activation function:

    G(x) = sum over activation funcs_i (activation_i(x, parameter_i,a) * weight(parameter_i,b)

Where the weight parameter and activation parameter are learnable. They use sine, exp activations to reflect behavious in physical systems.
