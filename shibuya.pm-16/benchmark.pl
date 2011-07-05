#!perl -w
use strict;
use Test::More;
use Benchmark qw(:all);
my $mail_re = `$^X mail.pl` or die;

my $perl = qr/$mail_re/;
my $re2 = do {
    use re::engine::RE2;
    qr/$mail_re/;
};
my $pcre = do {
    use re::engine::PCRE;
    qr/$mail_re/;
};

my $onig = do {
    use re::engine::Oniguruma;
    qr/$mail_re/;
};

my $mail = 'fuji.goro@dena.jp';

note 'for valid e-mail address';
like $mail, $perl, 'perl builtin' or die;
like $mail, $re2,  're2' or die;
like $mail, $pcre, 'pcre' or die;

cmpthese timethese 1000000, {
    perl => sub { $mail =~ $perl },
    re2  => sub { $mail =~ $re2 },
    pcre => sub { $mail =~ $pcre },
    onig => sub { $mail =~ $onig },
};

note 'for invalid e-mail address';
$mail = 'fuji.goro at dena.jp';

unlike $mail, $perl, 'perl builtin' or die;
unlike $mail, $re2,  're2' or die;
unlike $mail, $pcre, 'pcre' or die;
unlike $mail, $onig, 'onig' or die;

cmpthese timethese 1000000, {
    perl => sub { $mail =~ $perl },
    re2  => sub { $mail =~ $re2 },
    pcre => sub { $mail =~ $pcre },
    onig => sub { $mail =~ $onig },
};

done_testing;

