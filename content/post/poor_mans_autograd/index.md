+++
title = "Poor Man's Autograd"
date = '2026-03-27T22:57:59-07:00'
description = ""
link = ""
tags = []
categories = []
includes = []       # any javascript files to include
hasequations = true
haspython = true
tableofcontents = false
draft = true
+++

I recently came across [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95) - a single-file, python-only training script for a GPT model.

What stood out to me were 40 or so lines that implemented autograd. That is, calculating gradients of computations in native python. Autograd is not novel ([python autograd](https://autograd.readthedocs.io/en/latest/background.html)). It underpins every single deep learning library ([jax](https://docs.jax.dev/en/latest/automatic-differentiation.html), [torch](https://docs.pytorch.org/tutorials/beginner/blitz/autograd_tutorial.html), [tensorflow](https://www.tensorflow.org/guide/autodiff), [and yes, numpy too](https://github.com/HIPS/autograd)).

No, the reason I was so taken aback was explicitly facing the simplicity of the mechanism that has fueled machine learning for decades now. It's one thing to call `loss.backward()`; it's an entirely different thing to pause and examine what's happening underneath.

The goal of this post is to build up those 40 lines, step by step.

## The Chain Rule

$$
\frac{\partial}{\partial{x}} f(g(x)) = \frac{\partial}{\partial g(x)}f \cdot \frac{\partial}{\partial x} g(x)
$$

For example:

$$
f = g(x) + 2x \\\\
g(x) = kx \\\\
\frac{\partial}{\partial{x}}f = \frac{\partial}{\partial x}(g(x)) + \frac{\partial}{\partial x}(2x) \\\\
= \frac{\partial}{\partial g}(g(x))\cdot \frac{\partial}{\partial x} (kx) + \frac{\partial}{\partial x}(2x) \\\\
= (1 \cdot k) + 2
$$

Note:

```mermaid
graph LR

x[x]
g["g(x)"]
f["f(x)"]
two["2x"]

x --> g
g --> f
x --> two
two --> f
```

Looking at the graph, $x$ affects $f(x)$ twice: once through $g(x)$ and once through $2x$. Visually, the change in $f$ with respect to $x$ should add the change due to each of the two branches.

## The atomic value

We need to represent each scalar such that we can contain it's value and gradient. Each operation produces a new value.

```python
class Value:
    def __init__(self, data, grad):
        self.data = data
        self.grad = grad
        
    def __add__(self, other):
        result = self.data + other.data
        result_node = self.__class__(data=result, grad=1)
        return result_node
```

Let's try it out:

```python
w = Value(2, grad=0)
x = Value(1, grad=0)
y = w + x
z = y + x
print(z.data)
```

```mermaid
graph LR
w --"dy/dw"--> y
y --"dz/dy"--> z
x --"dy/dx"--> y
x --"dz/dx"--> z
```

Now, we need a backward pass. What is `dz/d[w,x,y]`? Note that the gradients of the two edges to `x` get added. Whereas the gradients of the successive edges `y--z` and `x--y` get multiplied.

Therefore, we need to track the dependencies of each node. Then we can calculate, for each operation, `d node / d dependency`. For addition, dependencies are the two arguments into the add operation.

```
z = y + x

for dep in z.dependencies:
    dep.grad = dep.grad + (z.grad * 1)
```

```python
class Value:
    def __init__(self, data, grad=None, deps=()):
        self.data = data
        self.grad = grad
        self.deps = deps
    def __repr__(self): return f"V({self.data}, {self.grad})"
    def __add__(self, other):
        data = self.data + other.data
        deps = (self, other)
        return Value(data=data, grad=None, deps=deps)
    def backward(self):
        # The root node: d(root)/d root = 1
        if self.grad is None:
            self.grad = 1
        for dep in self.deps:
            # This is the first time the dependency is seen.
            # It does not have any gradients accumulated.
            if dep.grad is None:
                dep.grad = 0
            # accumulating edges = last total + gradient of current edge
            dep.grad = dep.grad + (self.grad * 1)
            dep.backward()
```

Let's try it out:

```python
w = Value(2)
x = Value(1)
y = w + x
z = y + x
# z = (w+x) + x = w + 2x
# dz/dx = 2, dz/dy = 1, dz/dw = 1
print("z", z)

z.backward()
print(f"dz/dz: {z.grad}")
print(f"dz/dy: {y.grad}")
print(f"dz/dx: {x.grad}")
print(f"dz/dw: {w.grad}")
```

## Adding operations

Looking closely at the gradient accumulation line, let's think from the perspective of `y`:

```py
 dep.grad = dep.grad + (self.grad * 1)
```

The `self.grad * 1` is the chain rule in action. Where `1` is the gradient of an addition operation. `y = x + w`, `dy/dx = 1`. We're multiplying that by whatever gradients are coming down from top. In this case, `dz/dy`. Therefore, the gradient coming to `x` (the `dep` in `self.deps`) from `z` through `y` (self) is `dz/dy * dy/dx` i.e. `self.grad * 1`.

```mermaid
graph LR
x --"add"--> y
y --"add"--> z
```

If instead the operation from `x` to `y` were multiplication, the gradient would be different. Therefore, we need to track the operation that relates a node to its dependencies. Such that, the new gradient update line should become:

```py
 dep.grad = dep.grad + (self.grad * partial(self, dep, other))
```

Then:

```py
 partial_add = lambda self, dep, other_dep: 1
 partial_mul = lambda self, dep, other_dep: other_dep.data
 partial_pow = lambda self, dep, other_dep: other_dep.data * dep.data ** (other_dep.data-1)
 partial_exp = lambda self, dep, other_dep: self.data
```

This (`dep`, `other_dep`) works because all operations can be represented as a binary tree.

```python
class Value:
    def __init__(self, data, grad=None, deps=(), partials=()):
        self.data = data
        self.grad = grad
        self.deps = deps
        self.partials = partials
    def __repr__(self): return f"V({self.data}, {self.grad})"
    def __add__(self, other):
        data = self.data + other.data
        deps = (self, other)
        partials = (
            lambda self, dep, other_dep: 1,
            lambda self, dep, other_dep: 1
        )
        return Value(data=data, grad=None, deps=deps, partials=partials)
    def __mul__(self, other):
        data = self.data * other.data
        deps = (self, other)
        partials = (
            lambda self, dep, other_dep: other_dep.data,
            lambda self, dep, other_dep: other_dep.data
        )
        return Value(data=data, grad=None, deps=deps, partials=partials)
    def backward(self):
        # The root node: d(root)/d root = 1
        if self.grad is None:
            self.grad = 1
        if not self.deps:
            return # root node reached
        dep, *other = self.deps
        partial, *other_partial = self.partials
        
        if other:
            other = other[0]
            other_partial = other_partial[0]

        # This is the first time the dependency is seen.
        # It does not have any gradients accumulated.
        if dep.grad is None:
            dep.grad = 0
        # accumulating edges = last total + gradient of current edge
        dep.grad = dep.grad + (self.grad * partial(self, dep, other))
        dep.backward()

        if other:
            # This is the first time the dependency is seen.
            # It does not have any gradients accumulated.
            if other.grad is None:
                other.grad = 0
            # accumulating edges = last total + gradient of current edge
            other.grad = other.grad + (self.grad * other_partial(self, other, dep))
            other.backward()
```

Let's try it out:

```python
w = Value(2)
x = Value(1)
y = w * x
z = y + x
# z = (w*x) + x = wx + x
# dz/dx = w+1, dz/dy = 1, dz/dw = x
print("z", z)

z.backward()
print(f"dz/dz: {z.grad}")
print(f"dz/dy: {y.grad}")
print(f"dz/dx: {x.grad}")
print(f"dz/dw: {w.grad}")
```

We can clean this up a bit:

```python
class Value:
    _partials = {
        '+': lambda self, dep, other: 1,
        '*': lambda self, dep, other: other.data,
        '^': lambda self, dep, other: other.data * dep.data ** (other.data - 1),
        'e': lambda self, dep, other: self.data,
    }
    def __init__(self, data, grad=None, deps=(), partials=()):
        self.data = data
        self.grad = grad
        self.deps = deps
        self.partials = partials
    def __repr__(self): return f"V({self.data}, {self.grad})"
    def __add__(self, other):
        data = self.data + other.data
        deps = (self, other)
        partials = (self._partials['+'], self._partials['+'])
        return Value(data=data, grad=None, deps=deps, partials=partials)
    def __mul__(self, other):
        data = self.data * other.data
        deps = (self, other)
        partials = (self._partials['*'], self._partials['*'])
        return Value(data=data, grad=None, deps=deps, partials=partials)
    def __pow__(self, other):
        data = self.data**other.data
        deps = (self, other)
        partials = (self._partials['^'], None)
        return Value(data=data, grad=None, deps=deps, partials=partials)
    def backward(self):
        # The root node: d(root)/d root = 1
        if self.grad is None:
            self.grad = 1
        if not self.deps:
            return # root node reached
        dep, *other = self.deps
        partial, *other_partial = self.partials
        
        if other:
            other = other[0]
            other_partial = other_partial[0]

        # This is the first time the dependency is seen.
        # It does not have any gradients accumulated.
        if dep.grad is None:
            dep.grad = 0
        # accumulating edges = last total + gradient of current edge
        dep.grad = dep.grad + (self.grad * partial(self, dep, other))
        dep.backward()

        if other_partial is not None:
            # This is the first time the dependency is seen.
            # It does not have any gradients accumulated.
            if other.grad is None:
                other.grad = 0
            # accumulating edges = last total + gradient of current edge
            other.grad = other.grad + (self.grad * other_partial(self, other, dep))
            other.backward()
```

```python
w = Value(2)
x = Value(2)
y = w * x
z = y + x**Value(2)
# z = (w*x) + x**2 = wx + x
# dz/dx = w+2x, dz/dy = 1, dz/dw = x
print("z", z)

z.backward()
print(f"dz/dz: {z.grad}")
print(f"dz/dy: {y.grad}")
print(f"dz/dx: {x.grad}")
print(f"dz/dw: {w.grad}")
```