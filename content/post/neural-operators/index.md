+++
title = 'Neural Operators'
date = '2026-09-20T16:33:35-04:00'
lastmod = '2026-09-20T16:33:35-04:00'
description = "How neural operators make physics-informed deep learning possible."
link = ""
tags = []
categories = ["Machine Learning", "Physics"]
includes = []       # any javascript files to include
hasequations = false
haspython = false
tableofcontents = false
draft = true
image = ""
spotlight = false   # feature this post in the homepage spotlight grid
+++

{{< figure src="fno_schematic.png" caption="A screenshot from the FNO paper." >}}

Let's start with Fourier Neural Operators (FNOs). I steel myself whenever jumping into the frequency domain 🫨. Finally got around to studying them! Based on this very clearly written paper by Zongyi Li. I recommend you read it yourself!

https://arxiv.org/pdf/2010.08895


The big problem in the big domain: using neural networks for physics simulations has seen quite some work (see PINNs, NeuralODEs). Problem? The output is baked in. If you trained a sim on a 100x100x100 grid, that’s all you’ll ever see. Cannot zoom in, unless you train on a finer grid. This is where a couple of insights into frequency domain come in. First, an aside on how sims work:

{{< figure src="fno_1.png" >}}

Physics sims solve partial differential equations. Let’s say we’re looking at n-body problems. The bodies have some spatial distribution. The equation is a=F/m, where F is the gravitational force from all the bodies in the sim. The change in position may be due to the body x itself i.e. own thrust (local) and due to bodies y all over the sim space (global). We need to account for the effects of both. So, a=F/m is solved for each point in the sim, and each point in the sim looks at every other point. This operation is called convolution. The sim step for each point x looks like: x=(W(x)+b + ∫K(x, y)*v(y) dy, where K is the grav. field of y at x, and v is a representation of point y (here, y’s mass). Wx+b is local change due to x itself. Complexity when repeated for all x? O(n^2). Back to frequency insights:

{{< figure src="fno_2.png" >}}

(1) A wave with a frequency f has infinite resolution. It’s just a function (e.g sin(2 pi f*t) - you can keep zooming in. (2) (Periodic) Functions in space can be represented as superpositions of various frequencies i.e. a list of coefficients in freq domain. (3) Convolution in frequency domain is a point-wise multiplication, instead of integration i.e. O(N^2)-->O(N).

{{< figure src="fno_3.jpg" >}}

What if: we convert the inputs into frequency domain, convolve them, and convert back into space domain? (Fast) Fourier transform is O(NlogN), multiplication is O(N). Therefore total complexity is O(NlogN), *and* we get infinite resolution! This is a Fourier Neural Operator. A NN layer that handles frequency conversion, convolution, and conversion back to space.

Now, the nitty-gritty caveats & observations: (1) frequency domain assumes periodic boundary conditions (e.g. sine wave repeats every 2pi). (2) physical systems are non-linear. (3) local effects are represented by higher frequencies, global by lower frequencies. We can fix this by bifurcating across space / frequency domains: 

{{< figure src="fno_4.jpg" >}}

A FNO layer ends with an activation function σ. The activation function accumulates spatial and frequency processing of inputs:  σ(W x + b + 𝓕^-1(𝓕(K)*𝓕(x))). The frequency stream zeroes out higher frequencies in the frequency domain, applies some linear transformation 𝓕(K), and converts back to the spatial domain. Translation: integrating global effects. The spatial stream applies a linear transformation W to points. Translation: local effects. The activation, along with W, re-introduces non-linearities & higher freqs in the output such as boundary conditions omitted in the freq domain.

{{< figure src="fno_5.jpg" >}}

We can pass finer grids. The spatial part is a pointwise transform and the frequency transform doesn’t care about space. The same learned weights work out of the box.

Cons: needs high quality data, uniform grids. Pros: fast, resolution invariant.

## Extending Neural operators

After my FNO shallowdive, I had an epiphany: I could replace Fourier basis with [wavelets](https://en.wikipedia.org/wiki/Wavelet) for better localizability. Even better! I could have learnable [Koglomorov Arnold basis](https://en.wikipedia.org/wiki/Kolmogorov%E2%80%93Arnold_representation_theorem) to tailor to diverse domains.

It's been done already!

- https://arxiv.org/pdf/2205.02191
- https://arxiv.org/pdf/2509.16825
