---
title: Making a simple web app blindfolded, and with both arms tied…
author: ahmedi
layout: post
date: 2015-09-21T04:32:06+00:00
categories:
  - Developer
tags:
  - javascript
  - web app

---
Over the last weekend, I was looking to brush up my web-dev skills (what little I had learned on the side). I decided to make a simple web app for my residents to use (I am a Resident Advisor).

Objective: Display tips, event news, free food notifications provided regularly by RAs and faculty to residents on a website.<!--more-->

Front-end: A simple site with a big red button that would display &#8220;tips&#8221; one at a time.

Back-end: Umm&#8230;

I was using <a href="https://pages.github.com/" target="_blank">GitHub pages</a> to host my app. And GitHub pages do not let any one mess with back-end voodoo. The solution? Google Sheets!

It was the perfect back-end. I created a Google Form linked to my sheet and gave it to other RAs and faculty members. That way they wouldn&#8217;t have to see the labyrinthine array of cells. Plus, the form would help eliminate user error from directly working on the spreadsheet. And another big plus: I could add data validation features and data processing functions in sheets so everything would be in pristine condition.

Then I used this awesome library: <a href="https://github.com/jsoma/tabletop" target="_blank">Tabletop.js</a> to pull in my spreadsheet data. The rest was just using JavaScript to display the information however I pleased.

Simple. As. That.

You can see it in action <a href="http://hazrmard.github.io/VandySays" target="_blank">here</a>.
