+++
title = 'Locally running languagem models'
date = '2026-04-05T13:14:36-07:00'
description = ""
link = ""
tags = []
categories = []
includes = []       # any javascript files to include
hasequations = false
haspython = false
tableofcontents = false
draft = false
image = ""
+++

## Using llama.cpp

```zsh
llama-server -hf MODEL_NAME
```

Observed speeds on M5 pro (`brew install llama.cpp`):

- HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive:Q6_K: 35 tok/s
- unsloth/gemma-4-26B-A4B-it-GGUF: 57 tok/s

Observed speeds on RTX 4080 (`winget instal ggml.llamacpp`):

- HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive:Q6_K: 80 tok/s

Pointers:

- `--reasoning-budget 0` to disable thinking
- `-ngl 999` to offload all layes to GPU.


## Using huggingface transformers

