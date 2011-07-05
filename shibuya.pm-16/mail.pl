#!/usr/bin/env perl
use strict;
use warnings;
my $CR    = qq{\\x0D};
my $LF    = qq{\\x0A};
my $VCHAR = qq{[\\x21-\\x7E]};
my $WSP   = qq{[\\x20\\x09]};

my $obs_NO_WS_CTL  = qq{[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]};
my $obs_qtext      = $obs_NO_WS_CTL;
my $obs_qp         = qq{(?:\\\\(?:\\x00|$obs_NO_WS_CTL|$LF|$CR))};
my $quoted_pair    = qq{(?:\\\\(?:$VCHAR|$WSP)|$obs_qp)};
my $atext          = qq{[A-Za-z0-9!#\$%&'*+\\-/=?^_`{|}~]};
my $atom           = qq{(?:$atext+)};
my $dot_atom_text  = qq{(?:$atext+(?:\\.$atext+)*)};
my $dot_atom       = $dot_atom_text;
my $qtext          = qq{(?:[\\x21\\x23-\\x5B\\x5D-\\x7E]|$obs_qtext)};
my $qcontent       = qq{(?:$qtext|$quoted_pair)};
my $quoted_string  = qq{(?:"$qcontent*")};
my $obs_dtext      = qq{(?:$obs_NO_WS_CTL|$quoted_pair)};
my $dtext          = qq{(?:[\\x21-\\x5A\\x5E-\\x7E]|$obs_dtext)};
my $domain_literal = qq{(?:\\[$dtext*\\])};
my $word           = qq{(?:$atom|$quoted_string)};
my $obs_local_part = qq{(?:$word(?:\\.$word)*)};
my $obs_domain     = qq{(?:$atom(?:\\.$atom)*)};
my $local_part     = qq{(?:$dot_atom|$quoted_string|$obs_local_part)};
my $domain         = qq{(?:$dot_atom|$domain_literal|$obs_domain)};
my $addr_spec      = qq{$local_part\@$domain};

print "^$addr_spec\$";
