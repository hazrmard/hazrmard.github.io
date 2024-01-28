+++
title = 'The physics of multicopter drones'
date = '2024-01-27T19:22:34-06:00'
description = ""
tags = []
categories = []
link = ""
hasequations = true
includes = []       # any javascript files to include
tableofcontents = false
draft = true
+++

## Dynamics of multi-rotor UAVs

### Position and Orientation representation

A multi-rotor UAV is modeled as a rigid body with six degrees of freedom. A rigid body has a constant mass distribution relative to its center of gravity. The six degrees of freedom are the three spatial coordinates $x, y, z$ and the three Euler angles $\phi, \theta, \psi$.

Two reference frames are used for representing the state of the body:

1. Inertial, nominal reference frame $n$ is the static frame of reference where the axes are aligned with arbitrary, global directions. They are represented as $[\hat{x}, \hat{y}, \hat{z}]$.
2. Body-fixed reference frame $b$ has the axes aligned with respect to the center of gravity of the rigid body in motion. They are represented as $[\hat{b}_1, \hat{b}_2, \hat{b}_3]$.

Orientation of a body in the inertial reference frame follows the Tait-Bryan angles convention. That is, rotation is specified as yaw ($\psi$), pitch ($\theta$), and roll ($\phi$) in that order. The order of rotations matters. Starting from the inertial frame, yaw $\psi$ is rotation $R(\psi)$ of the body frame about the inertial $z$ axis. Pitch $\theta$ is rotation about the $y$ axis after the first rotation $R(\theta)\cdot R(\psi)$. And roll $\phi$ is the final rotation about the $x$ axis of the frame after the prior two rotations. The final product is the body reference frame.

Given the position in the inertial frame $\hat{r}^n=[x,y,z]^T$ and the position in the body frame $\hat{r}^b=[b_1,b_2,b_3]^T$, the rotation matrix from the inertial to body reference frames $R_n^b$ is defined as:

$$
\begin{align}
    \hat{r}^b &= R(\phi)\cdot R(\theta) \cdot R(\psi) \cdot \hat{r}^n \\\\
    \hat{r}^b &= R_n^b \hat{r}^n \\\\
    \begin{bmatrix}
    b_1 \\\\
    b_2 \\\\
    b_3 
    \end{bmatrix} &= 
    \begin{bmatrix}
    c\theta c\psi & c\theta s\psi & -s\theta \\\\
    -c\phi s\psi + s\phi s\theta c\psi & c\phi c\psi + s\phi s\theta s\psi & s\psi c\theta \\\\
    s\phi s\psi + c\phi s\theta c\psi & -s\phi c\psi + c\phi s\theta s\psi & c\psi c\theta
    \end{bmatrix}
    \begin{bmatrix}
    x \\\\
    y \\\\
    z
    \end{bmatrix}
\end{align}
$$

By convention, the right handed coordinate system is followed. The direction of the positive $x$ axis in the body frame ($b_1$) is considered "forward" orientation. The positive $y$ axis ($b_2$) is "left" and the positive $z$ axis ($b_3$) is up. For rotations about each axis, positive rotation is counter-clockwise, looking at the positive rotation axis coming out of the page.

For the body frame with an angular velocity about its axes with respect to the inertial frame $\hat{\omega}=[\omega_x,\omega_y,\omega_z]$, the time-derivative of a vector $\hat{\mathcal{V}}^b = \hat{\mathcal{V}} \cdot \hat{b}$ in a rotating body frame is given by the Coriolis theorem:

$$
\begin{align}
    \frac{d \hat{\mathcal{V}}^b}{d t} &= \frac{d \hat{\mathcal{V}}}{d t} \cdot \hat{b} + \frac{d \hat{b}}{d t} \cdot \hat{\mathcal{V}} \\\\
    &= \frac{d \hat{\mathcal{V}}}{d t} \cdot \hat{b} + \hat{\omega} \times \hat{\mathcal{V}}^b \\\\
    &= \frac{d \hat{\mathcal{V}}}{d t} \cdot \hat{b} + 
    \begin{bmatrix}
    0 & -\omega_z & \omega_y \\\\
    \omega_z & 0 & -\omega_x \\\\
    -\omega_y & \omega_x & 0
    \end{bmatrix} \hat{\mathcal{V}}
\end{align}
$$

### The state of the vehicle

Tracking the motion of the vehicle requires tracking multiple variables. The variables can be divided into translational and their rotational analogues.

1. $\hat{r}^n=[x,y,z]$ are the navigation coordinates.
2. $\hat{v^b}=[\dot{x}, \dot{y}, \dot{z}]$ is the velocity of the vehicle along the body frame axes.
3. $\hat{\Phi}=[\phi, \theta, \psi] $ is the orientation of the body reference frame $b$ in Euler angles (roll, pitch, yaw) with reference to the nominal reference frame $n$.
4. $\hat{\omega}=[\omega_x, \omega_y, \omega_z]$ is the roll rate of the three body frame axes with reference to the nominal frame.

The state variables above are affected by the forces and torques acting on the body.

1. $\hat{F}^b=[F_{b_1},F_{b_2},F_{b_3}]$ are the net forces along the three body frame axes, where $\hat{F}^b=R_n^b \hat{F}^n$.
2. $\hat{M}^b=[M_{b_1},M_{b_2},M_{b_3}]$ are the moments along the three body axes, where $\hat{M}^b=R_n^b \hat{M}^n$.

### Equations of motion

The equations of motion relate the state variables the the dynamics of the system. The equations of motion are derived from Newton's second law of motion. Where, for translational variables:

$$
\begin{align}
    \hat{F}^b &= m \frac{d \hat{v}^b}{d t} = m(\hat{\dot{v}}^b + \hat{\omega} \times \hat{v}^b)
\end{align}
$$

The above relationship can be re-written as using the abstraction provided by the Coriolis force:

$$
\begin{align}
     \hat{F}^n &= m(\hat{\dot{v}}^b + \hat{\omega} \times \hat{v}^b)
\end{align}
$$

For rotational variables a similar analogue exists. Given $M^b$ is the rotating body-frame moment, $\omega$ is the angular rate measured in the body frame (subject to the Coriolis effect), and $I$ is the moment of inertia:

$$
\begin{align}
    % \hat{r}^b \times \hat{F}^b &= m \cdot \hat{r}^b \times \frac{d \hat{v}^b}{d t} \\\\
    \hat{M}^b &= \hat{I}\frac{d \hat{\omega}}{d t} \\\\
    \hat{M}^b &= \hat{I}\hat{\dot{\omega}} + \hat{\omega} \times \hat{I}\hat{\omega}
\end{align}
$$

### Linear variables

The linear state variables ($\hat{r}^n$, $\hat{v}^b$) are determined primarily by the forces acting on the vehicle. The force of gravity $\hat{F_g}^n=[0,0,-mg]$ in the nominal reference frame. In the body frame it becomes $\hat{F_g}^b=R^b_n \hat{F}^n$. The net force of the $p$ propellers in the body frame is $\hat{F_p}^b=[0,0,\sum_i^p T_i]$. Thus, the total force acting on the center of mass is $\hat{F}^b=\hat{F_p}^b + \hat{F_g}^b$. Thus solving for acceleration $\hat{\dot{v}}^b$ and equating with the acceleration acting on the body frame $\hat{F}^b / m$ yields the rate of change of velocity $\hat{v}^b$ in the body frame.

Using $R_b^n$ and the current body frame velocity $\hat{v}^b$ gives the rate of change of position $r^n$ in the inertial frame.

### Angular variables

The angular state variables ($\hat{\omega}$, $\hat{\Phi}$) are governed by the moments acting on the body. The moments due to thrust acting on the propeller arm for each propeller are $\hat{M}\_T^b=\sum_i^p r\_i \times T_i$.
The yaw moments about $b_3$ due to the rotation of the motor are given by $\hat{M}\_\tau^b=\sum_i^p \tau_i$. The total moments about the body are $\hat{M}^b=\hat{M}\_T^b+\hat{M}\_\tau^b$. Solving the torque equation for $\hat{\omega}$, and substituting these moments, yields the rate of change of angular rate $\hat{\omega}$ in the body frame.

The rate of change of orientation $\hat{\Phi} = [\dot{\phi}, \dot{\theta}, \dot{\psi}]$ is related to the angular rate $\hat{\omega}$. The angular rate is the instantaneous rotation rate of the body axes. Whereas each angle of orientation is defined in its own reference frame during a sequence of ordered rotations from the inertial axes to the body frame (yaw, pitch, roll). Solving this quation gives the rate of change of orientation.

$$
    \begin{bmatrix}
    p \\\\
    q \\\\
    r
    \end{bmatrix} = R(\phi)\cdot R(\theta) \begin{bmatrix}
        0 \\\\ 0 \\\\ \dot{\psi}
    \end{bmatrix} + 
    R(\phi) \begin{bmatrix}
    0 \\\\ \dot{\theta} \\\\ 0
    \end{bmatrix} + 
    \begin{bmatrix}
    \dot{\phi} \\\\ 0 \\\\ 0
    \end{bmatrix}
$$

The rates of changes of the 12 (linear and angular) state variables can be integrated to track the state of the vehicle.
