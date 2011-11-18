From Template-Toolkit 2 to Xslate
======================

Fuji Goro (gfx)

<http://github.com/gfx/> 

Yokohama.pm#8 2011/11/18

⌘+shift+F で全画面表示
----
自己紹介
=====================
* `id:gfx` / `@__gfx__`
* Working at DeNA
* CPAN: Data::Util, Test::LeakTrace, Mouse

----
三行でまとめると
=====================

Xslate開発してます

TTからの違いはwikiに書きます

irc.perl.orgの *#xslate* に来てください

----
Xslateとは
=====================
Perl/XSのテンプレートエンジン

----
テンプレートエンジン
=====================
「こんにちは[% $user.name %]さん！」みたいなのを処理するプログラム

CPANではTemplate::ToolkitやHTML::Templateが有名

近代的なものだとMojo::Template, Text::MicroTemplate, Text::Xslateがある

----
* 特徴など -> そのまま進む
* TT2 to Xslate -> 「早速使いたい！」まで進む

----
# 特徴 I
----
高速
=====================
Template::Toolkitの約100倍

MobaSiF::Templateの約3倍

----
# 特徴 II
----
XSSに強い
=====================
スマートエスケープ

HTMLのメタキャラを自動的にエスケープする

最近のテンプレートエンジンの標準搭載機能

----
スマートエスケープ
=====================
* 基本はすべてエスケープ
* 値が「エスケープ済みか否か」という情報を持つので二重エスケープはおこらない
* XSSが起きる可能性がかなり抑えられる

----
例
=====================

    # in code:
    $vars->{foo} = '(>_<)';
    # in template:
    [% foo %] => (&gt;_&lt;)

    # in code
    $vars->{foo} = mark_raw('<em>Hi!</em>');
    # in template    [% foo %] => <em>Hi</em>

----
# 特徴 III
----
高機能
=====================

    # 四則演算
    [% foo + 1 %]
    # 入れ子のデータ構造
    [% foo["bar"][0] %]
    # 比較演算
    [% IF (a.age - b.age) > 10 and not another.flag %]
    # 別のテンプレートを取り込む
    [% INCLUDE "component.tt" %]

----
マクロ
=====================

    %%MACRO hello(name)
    Hello, [% name %]!
    %%END
    %% hello('Xslate') # Hello, Xslate!

    # 再帰もできる
    %%MACRO fib(n) BLOCK   
    %%    n <= 1
    %%        ? 1
    %%        : fib(n - 1) + fib(n - 2);
    %%END

----
高階マクロ
======================

    # mapとかreduceとか
    %%MACRO add42(n) BLOCK
    %%    n + 42
    %%END
    %% [1, 2, 3].map(add42) # => [42, 43, 44]

    %%MACRO add(x, y) BLOCK
    %%    x + y
    %%END
    %% [1, 2, 3].reduce(add) # => 1 + 2 + 3 = 6

----
早速使いたい！
=====================

* 手元の環境でINSTALL: `cpanm Text::Xslate`
* `$ xslate -s TTerse -e 'Hello world!'`

Amon2のデフォルトテンプレートエンジンがXslate/TTerseとなっています

----
TT2 to Xslate
====================
TT2互換構文TTerse

細かな点で違いがある

    14:50 nekok***: TT to xslateの移行でハマるところを
    14:50 nekok***: こうしてね♪
    14:50 nekok***: ってのがあると
    14:50 nekok***: いいきがする
    14:50 nekok***: 社内ツールTTでまたつくってしまった。。
    14:51 nekok***: コンテキストの違いを考慮してくれないから
    14:51 nekok***: 以外にハマるんだよね

----
NOTES
====================
TTerseはTTと違って

* INCUDEが裸のワードを受け付けない
* FOREACH item = list が構文エラー
* INCLUDE file WITH param1 = value ...でWITHが必須
* 関数/メソッドでスカラーコンテキスト強制
* マクロがレキシカルスコープ
* SETがレキシカルスコープ
* WRAPPERの微妙な違い
* FILTERの微妙な違い

また、注意すべき点として

* エンコーディング関係
* スマートエスケープ

----
# INCUDEが裸のワードを受け付けない

    # TT2
    [% INCLUDE "foo.tt" %] # OK
    [% INCLUDE  foo.tt  %]# ditto

    # TTerse
    [% INCLUDE "foo.tt" %] # OK
    [% INCLUDE  foo.tt  %] # $vars->{foo}{tt}を参照

TTerseは文脈依存で`a.b`の解釈を変えない

----
# FOREACH item = list が構文エラー

    # TT2
    [% FOREACH item IN list %] # OK
    [% INCLUDE item =  list %] # ditto

    # TTerse
    [% FOREACH item IN list %] # OK
    [% FOREACH item =  list %] # syntax error

TTerseは文脈依存で`a = b`の解釈を変えない

無闇矢鱈にエイリアスを作らない

----
# INCLUDE file WITH param1 = value ...でWITHが必須

    # TT2
    [% INCLUDE file WITH param1 = value1 %] # OK
    [% INCLUDE file      param1 = value1 %] # ditto

TTerseは省略をよしとしない

人の目にやさしく(& パーサーにやさしく)

---
# 関数/メソッドでスカラーコンテキスト強制

TTerseでコンテキストを制御するにはラッパーを書かなければならない

    sub call_foo_as_list {
        my($obj, @args) = @_;
        return [ $obj->foo(@args) ];
    }

コンテキストを見て結果を変えるのはよくない

しかし逆にこの結果`return @a;`を`return wantarray ? @a : \@a`に書き換えるはめに…

コンテキストの制御は導入するかも

----
# マクロがレキシカルスコープ

INCLUDEでマクロを取り込みたい

高優先順位で実装予定…

----
# SETがレキシカルスコープ

そういうものです

----
# WRAPPERの微妙な違い

まだ詳しく見てないですが違うらしい

Kolonのcascadeを移植することで対応できるはず

----
# FILTERの違い

TODO

----
# エンコーディング関係

render()に渡すパラメータはdecodeして与えてること

もしバイト列のまま扱いたいなら `input_layer => ':bytes'` として
パラメータはencodeして与えること

つまり*Perlでのテキストの扱いと同じ*です。

----
# スマートエスケープ

render()に渡すパラメータは自動的にHTMLエスケープします

エスケープの制御はデータ型で行う

エスケープさせないためにはプログラム側で「raw文字列型」にする

    $vars{foo} = mark_raw(...);
    $xslate->render($file, \%vars);

----
Kolonもあります
====================

Perl6ライクな構文Kolonもあります

TT2にこだわりがなければKolonのほうがお勧めです

    Hello, <: $user.name :> world!

Amon2::AeroというXslate/KolonがデフォルトのAmon2 flavorを作ってます

----
日本語ドキュメント
=====================
[wiki](https://github.com/xslate/xslate.github.com/wiki/Index.ja)で編集中（一般向け）

今日説明したようなことも書く予定です

----
三行でまとめると
=====================

Xslate開発してます

TTからの違いはwikiに書きます

irc.perl.orgの *#xslate* に来てください

----
Community
=====================
* IRC:  irc://irc.perl.org#xslate
* ML:   <http://groups.google.com/group/xslate>
* Wiki: <https://github.com/xslate/xslate.github.com/wiki/Index.ja>

----
Resouces
=====================
* <http://xslate.org/>
* <http://github.com/xslate>

----
    vim: set filetype=markdown:

