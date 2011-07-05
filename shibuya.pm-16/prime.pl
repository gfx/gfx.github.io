#!/usr/bin/env perl
use 5.10.0;
use strict;
use warnings;
use re::engine::RE2;
('1' x $_) !~ /^(11+?)\1+$/ and say for 2 .. 100;

