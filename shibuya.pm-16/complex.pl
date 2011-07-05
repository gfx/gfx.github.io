#!perl -w
# complex_re.pl
use strict;
my $tag_regex_ = q{[^"'<>]*(?:"[^"]*"[^"'<>]*|'[^']*'[^"'<>]*)*(?:>|(?=<)|$(?!\n))}; #'}}}}
my $comment_tag_regex =
    '<!(?:--[^-]*-(?:[^-]+-)*?-(?:[^>-]*(?:-[^>-]+)*?)??)*(?:>|$(?!\n)|--.*$)';
my $tag_regex = qq{$comment_tag_regex|<$tag_regex_};

for my $n(1 .. 32) {
    my $m = 2 ** $n;
    print $m, "\n";
    my $html = sprintf '<meta %s/>', "foo='bar' " x $m;
    $html =~ /$tag_regex/ or die "not ok\n";
}

