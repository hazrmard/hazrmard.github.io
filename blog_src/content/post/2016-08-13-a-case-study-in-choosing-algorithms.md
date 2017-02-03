---
title: A case study in choosing algorithms
author: ahmedi
layout: post
date: 2016-08-14T03:29:23+00:00
categories:
  - Developer
  - Physics
hasequations: false
hascode: false
---
This past year, I have been crunching data from [dark matter simulations][1]. Data size can get pretty large when it comes to scientific computing. As I write this post, I have a script running on 3.8 TB (that&#8217;s right &#8211; 3,700 gigabytes) of cosmic particles. At these levels one starts thinking about parallelizing computations. And therein lay my dilemma and a soon to be learned lesson.<!--more-->

Around the time I began working on this, I was taking an algorithms course. And we had just learned about the [bin packing problem][2]. It involves figuring out the best way to fit an arbitrary number of objects with different sizes into a set of bins so the least amount of bins are used. And it is a hard problem to figure out fast. To get around the difficulty, computer scientists come up with [heuristics][3]: shortcuts that give a &#8220;good enough&#8221; answer. And one heuristic is the First-fit algorithm. Essentially: find the fist bin with enough space, dump the object in, repeat.

Now, this bin packing problem was similar to my parallelization challenge. I had to divide my data into multiple processes to be computed independently. And so, with the enthusiasm that comes only with applying newfound knowledge, I [wrote some code][4]. It read the data, assigned them &#8220;size&#8221; based on the big-O complexity of my calculations, and binned them for each process. Sweet, right?

Not so fast. I was noticing that my processes were still taking different times to finish. The disparity was more than I was happy with. There could be several reasons. One, big-O complexity rarely ever translates to proportionate running times as it ignores factors such as OS background. Two, I was not accounting for file i/o and lower-order big-O complexities while &#8220;sizing&#8221; data. In practice vs. theory, these things matter. So what could I do?

My solution in the end was quite simple, and my biggest lesson with parallel computing. Instead of pre-partitioning data for each process, I kept it all in a single pool. As soon as a process was free, it took one package from the pool and did its thing. The processes naturally divvied up the work. All was well! Now this might be parallel 101 for many, but I was so caught up in the fancy new algorithm I had learned that I did not pause to see if a plebeian approach, so to speak, may work better.

Now, as my pizza arrives and my script chugs through terabytes of data, I can watch Netflix in peace knowing that my pet processes are making the best of their time.

 [1]: https://github.com/hazrmard/DarkMatterHalos
 [2]: https://en.wikipedia.org/wiki/Bin_packing_problem
 [3]: https://en.wikipedia.org/wiki/Heuristic_(computer_science)
 [4]: https://github.com/hazrmard/DarkMatterHalos#multi-core-processing
