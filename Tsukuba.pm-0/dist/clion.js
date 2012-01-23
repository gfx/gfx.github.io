(function () { var global = this; function require(p){ var path = require.resolve(p) , mod = require.modules[path]; if (!mod) throw new Error('failed to require "' + p + '"'); if (!mod.exports) { mod.exports = {}; mod.call(mod.exports, mod, mod.exports, require.relative(path), global); } return mod.exports;}require.modules = {};require.resolve = function(path){ var orig = path , reg = path + '.js' , index = path + '/index.js'; return require.modules[reg] && reg || require.modules[index] && index || orig;};require.register = function(path, fn){ require.modules[path] = fn;};require.relative = function(parent) { return function(p){ if ('.' != p.charAt(0)) return require(p); var path = parent.split('/') , segs = p.split('/'); path.pop(); for (var i = 0; i < segs.length; i++) { var seg = segs[i]; if ('..' == seg) path.pop(); else if ('.' != seg) path.push(seg); } return require(path.join('/')); };};require.register("clion.js", function(module, exports, require, global){
// module clion
"use strict";

/** @const {boolean} */
var CLION_DEBUG = true;

/** @const {string} */
var VERSION = "0.0.1";

/** @constructor */
var U64 = require('./uint64');

/** @const {Object} */
var meta = require('./meta');

/** @const */
var TableSchema = meta.TableSchema,
    MetaType    = meta.MetaType,
    C           = meta.C,
    opcodes     = meta.Opcodes;

function noop() { }

function warning(va_args) {
    console.log(va_args);
}

function Dump(va_args) {
    console.log(Array.prototype.splice.call(arguments, 0));
}
function XXX(va_args) {
    console.log(Array.prototype.splice.call(arguments, 0));
    throw new Error('XXX: stopped');
}
function TODO(name) {
    throw new Error("Not yet implemented: " + name);
}

/**
 * @constructor
 */
function InvalidImage(extra) {
    var msg        = extra !== undefined ? "(" + extra + ")" : "";
    this.__proto__ = new Error("Invalid CLI executable " + msg);
}

function assert(expr) {
    if(!expr) {
        throw new Error('Assertion failed: ' + expr);
    }
}
/**
 * @constructor
 */
var CacheMap = Object;

/**
 * @constructor
 */
function Domain(filename) {
    this.program_name = filename;
    // set_root_dir()
    this.assembly_dir = null; // todo?
    this.config_dir   = null; // todo?

    // TODO: many many initializatin...
    //
    this.ldstr_cache = new CacheMap();
}
Domain.instance = null;
Domain.get = function() {
    if(!this.instance) {
        this.instance = new this();
    }
    return this.instance;
};
/**
 * @param {Image} image
 * @param {number} idx
 * @return {string}
 */
Domain.prototype.ldstr = function(image, idx) {
    if(image.dynamic) {
        TODO('dynamic');
    }
    else {
        // TODO: verify string signature
        return this.ldstr_metadata_sig( image, image.metadata_user_string(idx) );
    }
};
/**
 * @param {Image} image
 * @param {number} sig
 * @return {string}
 */
Domain.prototype.ldstr_metadata_sig = function(image, sig) {
    var bytes;
    var len;
    var o = this.ldstr_cache[sig];
    if(o !== undefined) {
        return o;
    }

    len   = image.metadata_decode_value(sig);
    bytes = image.read_bytes(len);

    o = this.string_new_utf16(bytes, len);
    this.ldstr_cache[sig] = o;
    return o;
};
Domain.prototype.string_new_utf16 = function(bytes, len) {
    var str = '';
    var i;
    for(i = 0; i < len; i++) {
        if( (i+1) < len ) {
            // XXX: little endian only!
            str += String.fromCharCode( bytes[i] | (bytes[i+1]<<8) );
            i++;
        }
    }
    return str;
};
/**
 * @constructor
 */
function Context() { // thread context
}
/**
 * @constructor
 */
function Invocation() { // invocation frame
}
Invocation.prototype.init = function(parent, obj, args, retval, method) {
    this.parent         = parent;
    this.obj            = obj;
    this.stack_args     = args;
    this.retval         = retval;
    this.runtime_method = RuntimeMethod.get(method);
    this.ex             = null;
    this.ip             = null;
    this.invoke_trap    = 0;
};
/**
 * @constructor
 */
function RuntimeMethod(method) {
    var sig          = method.signature();
    this.method      = method;
    this.param_count = sig.param_count;
    this.hasthis     = sig.hasthis;
    this.valuetype   = method.klass.valuetype;
}
RuntimeMethod.get = function(method) {
    // TODO: implement jit_code_hash equivalent
    return new RuntimeMethod(method);
};

/**
 * @constructor
 */
function Type() {
}
/**
 * @constructor
 */
function Class() {
}
/**
 * @constructor
 */
function MethodHeader() {
}
/**
 * @constructor
 */
function Method() {
}
/**
 * @constructor
 */
function MethodPInvoke() { // Platform Invoke
}
/**
 * @constructor
 */
function MethodSignature() {
}


// see:
// mono_image_load_pe_data()@mono/metadata/image.c
// MonoMSDOSHeader@mono/metadata/cil-conff.h
//
// mono_image_open()
//  do_mono_image_open()
//      new image
//      new imageinfo
//      do_mono_image_load()
//          mono_image_load_pe_data()
//          mono_image_load_cli_data()
//              load_cli_header()
//              load_metadata()
//                  load_tables()
//          mono_image_load_names()
//          load_modules()
/**
 * @constructor
 */
function Image(data_view, name) {
   this.image_info = {};
   this.typespec   = {};
   this.memberref  = {};
   this.helper     = {};
   this.method     = {};
   this.property   = {};

   this.references = [];

   // internal caches
   this.class_cache       = new CacheMap();
   this.method_cache      = new CacheMap();
   this.methodref_cache   = new CacheMap();
   this.method_signatures = new CacheMap();

   this._offset    = 0;

   if(name) {
       this.image_name = name;
   }
   if(data_view) {
       this.load_pe_data(data_view);
   }

};

Image.prototype.toString = function() {
    return '<Clion.Image ' + this.module_name + ' ' + this.guid +  '>';
};

// data manipulators
/**
 * @return {number}
 */
Image.prototype.tell = function() {
    return this._offset;
};
/**
 * @param {number}
 * @return {void}
 */
Image.prototype.seek_set = function(offset) {
    this._offset = offset;
};
/**
 * @param {number}
 * @return {void}
 */
Image.prototype.seek_cur = function(offset) {
    this._offset += offset;
};

/**
 * @param {number=} offset
 * @return {number}
 */
Image.prototype.peek_u8 = function(offset) {
    return this.raw_data.getUint8(
        offset === undefined ? this._offset : offset);
};
/**
 * @param {number=} offset
 * @return {number}
 */
Image.prototype.peek_i8 = function(offset) {
    return this.raw_data.getInt8(
        offset === undefined ? this._offset : offset);
};
/**
 * @param {number=} offset
 * @return {number}
 */
Image.prototype.peek_u16 = function(offset) {
    return this.raw_data.getUint16(
        offset === undefined ? this._offset : offset);
};
/**
 * @param {number=} offset
 * @return {number}
 */
Image.prototype.peek_i16 = function(offset) {
    return this.raw_data.getInt16(
        offset === undefined ? this._offset : offset);
};
/**
 * @param {number=} offset
 * @return {number}
 */
Image.prototype.peek_u32 = function(offset) {
    return this.raw_data.getUint32(
        offset === undefined? this._offset : offset);
};
/**
 * @param {number=} offset
 * @return {number}
 */
Image.prototype.peek_i32 = function(offset) {
    return this.raw_data.getInt32(
        offset === undefined? this._offset : offset);
};
/**
 * @param {number=} offset
 * @return {number}
 */
Image.prototype.read_u8 = function() {
    return this.raw_data.getUint8(this._offset++);
};
/**
 * @param {number=} offset
 * @return {number}
 */
Image.prototype.read_u16 = function() {
    var v = this.raw_data.getUint16(this._offset, true);
    this._offset += 2;
    return v;
};
/**
 * @param {number=} offset
 * @return {number}
 */
Image.prototype.read_u32 = function() {
    var v = this.raw_data.getUint32(this._offset, true);
    this._offset += 4;
    return v;
};

/**
 * Read an 64 bit unsigned integer
 * @param {number=} offset
 * @return {U64}
 */
Image.prototype.read_u64 = function() {
    var lo, hi;
    lo = this.raw_data.getUint32(this._offset, true);
    this._offset += 4;
    hi = this.raw_data.getUint32(this._offset, true);
    this._offset += 4;
    return U64.from_le32(lo, hi);
};
/**
 * read bytes from the buffer
 * @param {number} len
 * @return {Array}
 */
Image.prototype.read_bytes = function(len)  {
    var bytes = new Array(+len),
        i;
    for(i = 0; i < len; i++) {
        bytes[i] = this.read_u8();
    }
    return bytes;
};
/**
 * read a nul-ended string from the buffer
 * @param {number=} len
 * @return {string}
 */
Image.prototype.read_str = function(max_len /* optional */) {
    var cstr = '', end_pos, i, c;
    if(max_len) {
        assert( max_len > 0 );
        end_pos = this._offset + max_len;
    }
    else {
        max_len = Infinity;
    }
    // TODO: deal with utf-8 multi-byte char
    while( cstr.length < max_len && (c = this.read_u8()) !== 0 ) {
        cstr += String.fromCharCode(c);
    }
    if(end_pos) {
        this._offset = end_pos;
    }
    return cstr;
};

/**
 * @param {number} s
 * @param {number} b
 * @return {number}
 */
Image.prototype.rtsize = function(s, b) {
    return s < (1 << b) ? 2 : 4;
};
/**
 * @param {number} table_idx
 * @return {number}
 */
Image.prototype.idx_size = function idx_size(table_idx) {
    return this.tables[table_idx].rows < 65536 ? 2 : 4;
};

/**
 * load and verify the executable binary
 * @param {DataView} data_view
 * @return {void}
 */
Image.prototype.load_pe_data = function(data_view) {
    var msdos, h, offset;

    this.raw_data = data_view;

    msdos  = this.load_msdos_header();
    h      = {}; // .NET header
    offset = msdos.pe_offset;

    this.image_info.header = h;

    offset = this.load_header(h, offset);
    if(offset < 0) {
        throw new InvalidImage(offset);
    };

    offset = this.load_section_tables(offset);

    this.load_cli_data();

    this.load_names();
    this.load_modules();

    this.seek_set(this.heap_guid.data);
    this.guid = this.format_guid( this.read_bytes( this.heap_guid.size ) );
};
/**
 * load the MS-DOS header
 * @return {void}
 */
Image.prototype.load_msdos_header = function() {
    var sig,
        msdos = {};

    this.seek_set(0);
    sig = this.read_str(2);
    if(sig !== "MZ") {
        throw new InvalidImage();
    }

    msdos.msdos_sig     = sig;
    msdos.nlast_page    = this.read_u16();
    msdos.npages        = this.read_u16();
    msdos.msdos_header  = this.read_bytes(54);
    msdos.pe_offset     = this.read_u32();
    msdos.msdos_header2 = this.read_bytes(64);
    return msdos;
};
Image.prototype.read_dir_entry = function(offset) {
    var de = {};
    de.rva  = this.read_u32(offset);
    de.size = this.read_u32(offset);
    return de;
};
Image.prototype.load_header = function(h, offset) {
    var coff, pe, nt, datadir;

    this.seek_set(offset);
    h.pesig              = this.read_bytes(4);

    h.coff = coff = {}; // CoffHeader
    coff.machine         = this.read_u16();
    coff.sections        = this.read_u16()
    coff.time            = this.read_u32()
    coff.symptr          = this.read_u32()
    coff.symcount        = this.read_u32()
    coff.opt_header_size = this.read_u16()
    coff.oattributes     = this.read_u16()

    h.pe = pe = {}; // PEHeader
    pe.magic             = this.read_u16();
    pe.major             = this.read_u8();
    pe.minor             = this.read_u8();
    pe.code_size         = this.read_u32();
    pe.data_size         = this.read_u32();
    pe.uninit_data_size  = this.read_u32();
    pe.rva_entry_point   = this.read_u32();
    pe.rva_code_base     = this.read_u32();
    pe.rva_data_base     = this.read_u32();

    h.nt = nt = {}; // PEHeaderNT
    nt.image_base        = this.read_u32();
    nt.section_align     = this.read_u32();
    nt.file_alignment    = this.read_u32();
    nt.os_major          = this.read_u16();
    nt.os_minor          = this.read_u16();
    nt.user_major        = this.read_u16();
    nt.user_minor        = this.read_u16();
    nt.subsys_major      = this.read_u16();
    nt.subsys_minor      = this.read_u16();
    nt.reserved_1        = this.read_u32();
    nt.image_size        = this.read_u32();
    nt.header_size       = this.read_u32();
    nt.checksum          = this.read_u32();
    nt.subsys_required   = this.read_u16();
    nt.dll_flags         = this.read_u16();
    nt.stack_reserve     = this.read_u32();
    nt.stack_commit      = this.read_u32();
    nt.heap_reserve      = this.read_u32();
    nt.heap_commit       = this.read_u32();
    nt.loader_flags      = this.read_u32();
    nt.data_dir_count    = this.read_u32();

    h.datadir = datadir = {};
    datadir.export_table      = this.read_dir_entry();
    datadir.import_table      = this.read_dir_entry();
    datadir.resource_table    = this.read_dir_entry();
    datadir.exception_table   = this.read_dir_entry();
    datadir.certificate_table = this.read_dir_entry();
    datadir.reloc_table       = this.read_dir_entry();
    datadir.debug             = this.read_dir_entry();
    datadir.copyright         = this.read_dir_entry();
    datadir.global_ptr        = this.read_dir_entry();
    datadir.tls_table         = this.read_dir_entry();
    datadir.load_config_table = this.read_dir_entry();
    datadir.bound_import      = this.read_dir_entry();
    datadir.iat               = this.read_dir_entry();
    datadir.delay_import_desc = this.read_dir_entry();
    datadir.cli_header        = this.read_dir_entry();
    datadir.reserved          = this.read_dir_entry();

    // verify
    if( pe.magic === 0x10B ) {
        // TODO
    }
    else if( pe.magic === 0x20B ) { // PE32+ format
        // TODO
    }
    else {
        throw new InvalidImage();
    }

    if( nt.image_base !== 0x400000 ) {
        throw new InvalidImage();
    }
    if( nt.section_align !== 0x2000 ) {
        throw new InvalidImage();
    }
    if(!(nt.file_alignment === 0x200 || nt.file_alignment === 0x1000)) {
        throw new InvalidImage();
    }
    if( nt.os_major !== 4 ) {
        throw new InvalidImage();
    }
    if( nt.os_minor !== 0 ) {
        throw new InvalidImage();
    }

    return this.tell();
};
Image.prototype.load_section_tables = function(offset) {
    var iinfo = this.image_info;
    var top   = iinfo.header.coff.sections,
        i, t, namelen;

    iinfo.section_count  = top;
    iinfo.section_tables = []; // SetionTable
    iinfo.sections       = []; // ptr

    this.seek_set(offset);
    for(i = 0; i < top; i++) {
        t = iinfo.section_tables[i] = {};

        t.name = this.read_str(8);
        t.virtual_size    = this.read_u32();
        t.virtual_address = this.read_u32();
        t.raw_data_size   = this.read_u32();
        t.raw_data_ptr    = this.read_u32();
        t.reloc_ptr       = this.read_u32();
        t.lineno_ptr      = this.read_u32();
        t.reloc_count     = this.read_u32();
        t.line_count      = this.read_u32();
    }
};
Image.prototype.load_cli_data = function() {
    this.load_cli_header();
    this.load_metadata();
};
Image.prototype.load_cli_header = function() {
    var iinfo = this.image_info;
    var h     = iinfo.header,
        offset, cli_header;

    offset = this.cli_rva_image_map(h.datadir.cli_header.rva);
    if(offset === 0) {
        throw new InvalidImage();
    }
    this.seek_set(offset);

    cli_header = iinfo.cli_header = {}; // CLIHeader
    cli_header.size          = this.read_u32();
    cli_header.runtime_major = this.read_u16();
    cli_header.runtime_minor = this.read_u16();
    cli_header.metadata      = this.read_dir_entry();
    cli_header.flags         = this.read_u32();

    cli_header.entry_point                = this.read_u32();
    cli_header.resources                  = this.read_dir_entry();
    cli_header.strong_name                = this.read_dir_entry();
    cli_header.code_manager_table         = this.read_dir_entry();
    cli_header.vtable_fixups              = this.read_dir_entry();
    cli_header.export_address_table_jumps = this.read_dir_entry();

    cli_header.eeinfo_table    = this.read_dir_entry();
    cli_header.helper_table    = this.read_dir_entry();
    cli_header.dynamic_info    = this.read_dir_entry();
    cli_header.delay_load_info = this.read_dir_entry();
    cli_header.module_image    = this.read_dir_entry();
    cli_header.external_fixups = this.read_dir_entry();
    cli_header.ridmap          = this.read_dir_entry();
    cli_header.debug_map       = this.read_dir_entry();
    cli_header.ip_map          = this.read_dir_entry();
};
Image.prototype.load_metadata = function() {
    var iinfo = this.image_info;
    var cli_header = iinfo.cli_header,
        offset, size, metadata_offset, str_len,
        streams, i, pad, type, o;

    // metadata ptr
    offset = this.cli_rva_image_map(cli_header.metadata.rva);
    if(offset === 0) {
        throw new InvalidImage();
    }
    size = cli_header.metadata.size;
    this.raw_metadata = { data: offset, size: offset + size };
    metadata_offset = offset;

    this.seek_set(offset);
    if( this.read_str(4) !== "BSJB" ) {
        throw new InvalidImage();
    }

    this.version_major = this.read_u16();
    this.version_minor = this.read_u16();
    this.seek_cur(4);

    str_len = this.read_u32();
    this.version = this.read_str(str_len);
    pad = this.tell() - metadata_offset;
    if( pad  % 4 ) {
        this.seek_cur(4 - (pad  % 4));
    }
    this.seek_cur(2); // skip over flags

    streams = this.read_u16();

    for(i = 0; i < streams; i++) {
        o = {};
        o.data = metadata_offset + this.read_u32();
        o.size = this.read_u32(offset); // size of heap

        type = this.read_str();

        switch(type) {
        case "#~":
            this.heap_tables = o;
            break;
        case "#Strings":
            this.heap_strings = o;
            break;
        case "#US":
            this.heap_us = o;
            break;
        case "#Blob":
            this.heap_blob = o;
            break;
        case "#GUID":
            this.heap_guid = o;
            break;
        case "#-":
            this.heap_tables = o;
            this.uncompressed_metadata = true;
            warning("Assembly has the non standard metadata heap #-.");
            break;
        default:
            throw new Error("Unknown heap type: "
                            + JSON.stringify(type));
            break;
        }

        pad = this.tell() - this.raw_metadata.data;
        if(pad % 4) {
            this.seek_cur(4 - (pad % 4));
        }
    }

    this.load_tables();
};
Image.prototype.load_tables = function() { // from the "#~" stream
    var heap_tables = this.heap_tables.data;
    var offset, heap_sizes,
        valid_mask, sorted_mask,
        rows, table, o, flag,
        valid = 0;

    this.seek_set(heap_tables + 6);
    heap_sizes = this.read_u8();
    this.idx_string_wide = !!( heap_sizes & 0x01 );
    this.idx_guid_wide   = !!( heap_sizes & 0x02 );
    this.idx_blob_wide   = !!( heap_sizes & 0x04 );

    this.seek_set(heap_tables + 8);
    valid_mask  = this.read_u64();
    sorted_mask = this.read_u64();

    this.tables = new Array(C.TABLE_LAST + 1);
    for(table = 0; table < 64; table++) {
        o = null;
        if(TableSchema[table]) {
            // deep copy
            o = JSON.parse( JSON.stringify(TableSchema[table]) );
        }

        if( !valid_mask.at(table) ) {
            if( table > C.TABLE_LAST ) {
                continue;
            }
            o.rows = 0;
            this.tables[table] = { rows: 0 };
            continue;
        }
        if( table > C.TABLE_LAST ) {
            warning("bits in valid must be zero above 0x2d");
        }
        else {
            o.rows = this.read_u32();
        }
        this.tables[table] = o;

        valid++;
    }
    this.tables_base = (heap_tables + 24) + (4 * valid);
    assert(this.tables_base === this.tell());
    this.metadata_compute_table_bases();
};
/**
 * @param {number} addr
 * @return {number}
 */
Image.prototype.cli_rva_image_map = function(addr) {
    var iinfo  = this.image_info;
    var top    = iinfo.section_count,
        tables = iinfo.section_tables,
        i, t, beg, end;
    for(i = 0; i < top; i++) {
        t = tables[i];
        beg = t.virtual_address;
        end = t.virtual_address + t.raw_data_size;
        if( addr >= beg && addr < end ) {
            return addr - beg + t.raw_data_ptr;
        }
    }
    return 0;
};
/**
 * @param {number} addr
 * @return {number}
 */
Image.prototype.rva_map = function(addr) {
    var iinfo  = this.image_info;
    var top    = iinfo.section_count;
    var tables = iinfo.section_tables;
    var t, i;
    for(i = 0; i < top; i++) {
        t = tables[i];
        if((addr >= t.virtual_address) &&
           (addr <  t.virtual_address + t.raw_data_size)) {
            this.ensure_section_idx(i);
            return iinfo.sections[i] + (addr - t.virtual_address);
        }
    }
    return 0;
};
/**
 * @param {number} section
 * @return {void}
 */
Image.prototype.ensure_section_idx = function(section) {
    var iinfo  = this.image_info;
    var sect;

    assert( section < iinfo.section_count );

    if(iinfo.sections[section]) {
        return;
    }

    sect = iinfo.section_tables[section];

    //writable = (sect.flags & C.SECT_FLAGS_MEM_WRITE);

    //assert(sect.raw_data_ptr + sect.raw_data_size <= this.raw_data.length);

    iinfo.sections[section] = sect.raw_data_ptr;
    return;
};
Image.prototype.load_names = function() {
    // FIXME: something's wrong (?)
    if(this.tables[C.TABLE_ASSEMBLY].rows) {
        this.assembly_name = this.load_cstring_from_string_heap(
            this.tables[C.TABLE_ASSEMBLY], 0, C.ASSEMBLY_NAME
        );
    }
    this.module_name = this.load_cstring_from_string_heap(
        this.tables[C.TABLE_MODULE], 0, C.MODULE_NAME
    );
};
Image.prototype.load_modules = function() {
    var t;
    assert( !this.modules );

    t = this.tables[C.TABLE_MODULEREF];
    this.modules        = new Array(t.rows); // of Clion.Image
    this.modules_loaded = new Array(t.rows); // of bool
    this.module_count   = t.rows;
};

// metadata decoder
// see mono_metadata_compute_table_bases()@mono/metadata/metadata.c
Image.prototype.metadata_compute_table_bases = function() {
    var i, table, base;
    base = this.tables_base;
    for(i = 0; i < this.tables.length; i++) {
        table = this.tables[i];
        if(table.rows === 0) {
            continue;
        }

        table.row_size = this.metadata_compute_size(i, table);
        table.base     = base;

        base += table.rows * table.row_size;
    }
};
Image.prototype.metadata_compute_size = function(table_index, table) {
    var table = this.tables[table_index],
        i, code, field_size, n,
        bitfield   = 0,
        size       = 0,
        shift      = 0;
    //
    table.field_size = [ ];
    for(i = 0; i < table.fields.length; i++) {
        switch(table.field_type[i]) {
        case MetaType.UINT32: field_size = 4; break;
        case MetaType.UINT16: field_size = 2; break;
        case MetaType.UINT8:  field_size = 1; break;

        case MetaType.BLOB_IDX:
            field_size = this.idx_blob_wide ? 4 : 2;
            break;
        case MetaType.STRING_IDX:
            field_size = this.idx_string_wide ? 4 : 2;
            break;
        case MetaType.GUID_IDX:
            field_size = this.idx_guid_wide ? 4 : 2;
            break;

        case MetaType.TABLE_IDX:
            switch (table_index) {
            case C.TABLE_ASSEMBLYREFOS:
                assert (i === 3);
                field_size = this.idx_size(C.TABLE_ASSEMBLYREF); break;
            case C.TABLE_ASSEMBLYREFPROCESSOR:
                assert (i === 1);
                field_size = this.idx_size(C.TABLE_ASSEMBLYREF); break;
            case C.TABLE_CLASSLAYOUT:
                assert (i === 2);
                field_size = this.idx_size(C.TABLE_TYPEDEF); break;
            case C.TABLE_EVENTMAP:
                assert (i === 0 || i === 1);
                field_size = i ? this.idx_size(C.TABLE_EVENT)
                               : this.idx_size(C.TABLE_TYPEDEF);
                break;
            case C.TABLE_EVENT_POINTER:
                assert (i === 0);
                field_size = this.idx_size(C.TABLE_EVENT); break;
            case C.TABLE_EXPORTEDTYPE:
                assert (i === 1);
                field_size = 4; break;
            case C.TABLE_FIELDLAYOUT:
                assert (i === 1);
                field_size = this.idx_size(C.TABLE_FIELD); break;
            case C.TABLE_FIELDRVA:
                assert (i === 1);
                field_size = this.idx_size(C.TABLE_FIELD); break;
            case C.TABLE_FIELD_POINTER:
                assert (i === 0);
                field_size = this.idx_size(C.TABLE_FIELD); break;
            case C.TABLE_IMPLMAP:
                assert (i === 3);
                field_size = this.idx_size(C.TABLE_MODULEREF); break;
            case C.TABLE_INTERFACEIMPL:
                assert (i === 0);
                field_size = this.idx_size(C.TABLE_TYPEDEF); break;
            case C.TABLE_METHOD:
                assert (i === 5);
                field_size = this.idx_size(C.TABLE_PARAM); break;
            case C.TABLE_METHODIMPL:
                assert (i === 0);
                field_size = this.idx_size(C.TABLE_TYPEDEF); break;
            case C.TABLE_METHODSEMANTICS:
                assert (i === 1);
                field_size = this.idx_size(C.TABLE_METHOD); break;
            case C.TABLE_METHOD_POINTER:
                assert (i === 0);
                field_size = this.idx_size(C.TABLE_METHOD); break;
            case C.TABLE_NESTEDCLASS:
                assert (i === 0 || i === 1);
                field_size = this.idx_size(C.TABLE_TYPEDEF); break;
            case C.TABLE_PARAM_POINTER:
                assert (i === 0);
                field_size = this.idx_size(C.TABLE_PARAM); break;
            case C.TABLE_PROPERTYMAP:
                assert (i === 0 || i === 1);
                field_size = i ? this.idx_size(C.TABLE_PROPERTY)
                               : this.idx_size(C.TABLE_TYPEDEF);
                break;
            case C.TABLE_PROPERTY_POINTER:
                assert (i === 0);
                field_size = this.idx_size(C.TABLE_PROPERTY); break;
            case C.TABLE_TYPEDEF:
                assert (i === 4 || i === 5);
                field_size = i == 4 ? this.idx_size(C.TABLE_FIELD)
                                    : this.idx_size(C.TABLE_METHOD);
                break;
            case C.TABLE_GENERICPARAM:
                assert (i === 2);
                n = Math.max(
                    this.tables[C.TABLE_METHOD].rows,
                    this.tables[C.TABLE_TYPEDEF].rows
                );
                field_size = this.rtsize(n, 16 - C.TYPEORMETHOD_BITS);
                break;
            case C.TABLE_GENERICPARAMCONSTRAINT:
                assert (i === 0);
                field_size = this.idx_size(C.TABLE_GENERICPARAM);
                break;

            default:
                throw new Error("Can't handle Type.TABLE_IDX for table " +
                                table_index + " element " + i);
            }
            break;

        case MetaType.CONST_IDX: // HasConstant
            n = Math.max( this.tables[C.TABLE_PARAM].rows,
                          this.tables[C.TABLE_FIELD].rows,
                          this.tables[C.TABLE_PROPERTY].rows );
            field_size = this.rtsize(n, 16-2);
            break;
		case MetaType.HASCAT_IDX: // HasCastomAttribute
            n = Math.max(
                this.tables[C.TABLE_METHOD].rows,
                this.tables[C.TABLE_FIELD].rows,
                this.tables[C.TABLE_TYPEREF].rows,
                this.tables[C.TABLE_TYPEDEF].rows,
                this.tables[C.TABLE_PARAM].rows,
                this.tables[C.TABLE_INTERFACEIMPL].rows,
                this.tables[C.TABLE_MEMBERREF].rows,
                this.tables[C.TABLE_MODULE].rows,
                this.tables[C.TABLE_DECLSECURITY].rows,
                this.tables[C.TABLE_PROPERTY].rows,
                this.tables[C.TABLE_EVENT].rows,
                this.tables[C.TABLE_STANDALONESIG].rows,
                this.tables[C.TABLE_MODULEREF].rows,
                this.tables[C.TABLE_TYPESPEC].rows,
                this.tables[C.TABLE_ASSEMBLY].rows,
                this.tables[C.TABLE_ASSEMBLYREF].rows,
                this.tables[C.TABLE_FILE].rows,
                this.tables[C.TABLE_EXPORTEDTYPE].rows,
                this.tables[C.TABLE_MANIFESTRESOURCE].rows );
            field_size = this.rtsize(n, 16-5);
            break;
		case MetaType.CAT_IDX: // CustomAttributeType
            n = Math.max(
                this.tables[C.TABLE_TYPEREF].rows,
                this.tables[C.TABLE_TYPEDEF].rows,
                this.tables[C.TABLE_METHOD].rows,
                this.tables[C.TABLE_MEMBERREF].rows );
            field_size = this.rtsize(n, 16-3);
            break;
		case MetaType.HASDEC_IDX: // HasDeclSecurity
            n = Math.max(
                this.tables[C.TABLE_TYPEDEF].rows,
                this.tables[C.TABLE_METHOD].rows,
                this.tables[C.TABLE_ASSEMBLY].rows );
            field_size = this.rtsize(n, 16-2);
            break;
		case MetaType.IMPL_IDX: // Implementation
            n = Math.max(
                this.tables[C.TABLE_FILE].rows,
                this.tables[C.TABLE_ASSEMBLYREF].rows,
                this.tables[C.TABLE_EXPORTEDTYPE].rows );
            field_size = this.rtsize(n, 16-2);
            break;
		case MetaType.HFM_IDX: // HasFieldMarshall
            n = Math.max(
                this.tables[C.TABLE_FIELD].rows,
                this.tables[C.TABLE_PARAM].rows );
            field_size = this.rtsize(n, 16-1);
            break;
		case MetaType.MF_IDX: // MemberForwarded
            n = Math.max(
                this.tables[C.TABLE_FIELD].rows,
                this.tables[C.TABLE_METHOD].rows );
            field_size = this.rtsize(n, 16-1);
            break;
		case MetaType.TDOR_IDX: // TypeDefOrRef
            n = Math.max(
                this.tables[C.TABLE_TYPEDEF].rows,
                this.tables[C.TABLE_TYPEREF].rows,
                this.tables[C.TABLE_TYPESPEC].rows );
            field_size = this.rtsize(n, 16-2);
            break;
		case MetaType.MRP_IDX: // MemberRefParent
            n = Math.max(
                this.tables[C.TABLE_TYPEDEF].rows,
                this.tables[C.TABLE_TYPEREF].rows,
                this.tables[C.TABLE_METHOD].rows,
                this.tables[C.TABLE_MODULEREF].rows,
                this.tables[C.TABLE_TYPESPEC].rows,
                this.tables[C.TABLE_MEMBERREF].rows );
            field_size = this.rtsize(n, 16-3);
            break;
		case MetaType.MDOR_IDX: // MethoDefOrRef
            n = Math.max(
                this.tables[C.TABLE_METHOD].rows,
                this.tables[C.TABLE_MEMBERREF].rows );
            field_size = this.rtsize(n, 16-1);
            break;
		case MetaType.HS_IDX: // HasSemantics
            n = Math.max(
                this.tables[C.TABLE_PROPERTY].rows,
                this.tables[C.TABLE_EVENT].rows );
            field_size = this.rtsize(n, 16-1);
            break;
		case MetaType.RS_IDX: // ResolutionScope
            n = Math.max(
                this.tables[C.TABLE_MODULE].rows,
                this.tables[C.TABLE_MODULEREF].rows,
                this.tables[C.TABLE_ASSEMBLYREF].rows,
                this.tables[C.TABLE_TYPEREF].rows );
            field_size = this.rtsize(n, 16-2);
            break;
        default:
            throw "Unknown field type for " + table.name + "." + table.fields[i];
        }
        table.field_size[i] = field_size;

        bitfield |= (field_size-1) << shift;
		shift += 2;
		size += field_size;
    }

    table.size_bitfield = (i << 24) | bitfield;
    return size;
};
Image.prototype.load_cstring_from_string_heap = function(t, idx, col) {
    var offset = this.metadata_decode_row_col(t, idx, col);
    return this.metadata_string_heap(offset);
};
Image.prototype.metadata_string_heap = function(idx) {
    if( idx >= this.heap_strings.size ) return "";
    this.seek_set(this.heap_strings.data + idx);
    return this.read_str();
};
Image.prototype.metadata_user_string = function(idx) {
    return this.heap_us.data + idx;
};
Image.prototype.metadata_decode_blob = function(idx) {
    if( idx >= this.heap_blob.size ) return { };
    var size = this.metadata_decode_value( this.heap_blob.data + idx);
    return {
        data: this.tell(),
        size: size,
    };
};
/**
* @param  {number=} offset
* @return {number}
* */
Image.prototype.metadata_decode_value = function(offset) {
    if(offset !== undefined) {
        this.seek_set(offset);
    }
    var value = this.read_u8();
    if( (value & 0x80) === 0 ) {
        value &= 0x7f;
    }
    else if( (value & 0x40) == 0 ) {
        value &= 0x3f;
        value <<= 8;
        value |= this.read_u8();
    }
    else {
        value &= 0x1f;
        value <<= 24;
        value |= this.read_u8() << 16;
        value |= this.read_u8() <<  8;
        value |= this.read_u8();
    }
    return value;
};
Image.prototype.metadata_typedef_from_method = function(idx) {
    var tdef = this.tables[C.TABLE_TYPEDEF],
        token_idx, i, mlist_idx;
    token_idx = this.metadata_token_index(idx);

    if(this.uncompressed_metadata) {
        token_idx = this.search_ptr_table(C.TABLE_METHOD_POINTER, token_idx);
    }

    // FIXEM: Image don't know the why
    return token_idx;
    /*
    // XXX: performs linear search, but binary search can be better
    for(i = 0; i < tdef.rows; i++) {
        mlist_idx = this.metadata_decode_row_col(tdef, i, C.TYPEDEF_METHOD_LIST);
        //console.log([i, mlist_idx, token_idx, this.load_cstring_from_string_heap(tdef, i, C.TYPEDEF_NAME)]);
        if(mlist_idx === token_idx) {
            return i + 1;
        }
    }
    return 0;
    */
};
Image.prototype.metadata_interface_from_typedef_full= function(idx, heap_allc_result, context) {
    var tdef = this.tables[C.TABLE_INTERFACEIMPL];
    var interfaces = [];
    if(!tdef.base) {
        return interfaces;
    }
    TODO('interface');
};
Image.prototype.format_guid = function(binary) {
    var guid = new Array(binary.length),
        i, x;
    for(i = 0; i < binary.length; i++) {
        x = binary[i].toString(16).toUpperCase();
        guid[i] = ( x.length === 1 ? '0' + x : x);
    }
    return guid[3] + guid[2] + guid[1] + guid[0] +
            '-' + guid[5]  + guid[4] +
            '-' + guid[7]  + guid[6] +
            '-' + guid[8]  + guid[9] +
            '-' + guid[10] + guid[11] + guid[12] +
                  guid[13] + guid[14] + guid[15];
};
Image.prototype.metadata_decode_row = function(t, idx) {
    var i, cols;

    assert( idx < t.rows );
    assert( idx >= 0 );

    this.seek_set( t.base + (idx * t.row_size) );

    cols = new Array(t.fields.length);
    for(i = 0; i < t.fields.length; i++) {
        switch(t.field_size[i]) {
        case 1: cols[i] = this.read_u8();  break;
        case 2: cols[i] = this.read_u16(); break;
        case 4: cols[i] = this.read_u32(); break;
        default: throw new InvalidImage();
        }
    }
    return cols;
};
Image.prototype.metadata_decode_row_col = function(t, idx, col) {
    var i, offset;
    // FIXME: this is very slow!
    assert( idx < t.rows );
    assert( col < t.fields.length );
    offset = t.base + (idx * t.row_size);
    for(i = 0; i < col; i++) {
        offset += t.field_size[i];
    }
    switch(t.field_size[col]) {
    case 1: return this.peek_u8(offset);
    case 2: return this.peek_u16(offset);
    case 4: return this.peek_u32(offset);
    throw new InvalidImage();
    }
};

Image.prototype.metadata_token_table = function(t) {  return t >> 24; };
Image.prototype.metadata_token_index = function(t) {  return t & 0x00ffffff; };
Image.prototype.metadata_token_code  = function(t) {  return t & 0xff000000; };

Image.prototype.metadata_prepare_param_attrs = function(def) {
    var mt = this.tables[C.TABLE_METHOD],
        lastp,
        idx = this.metadata_decode_row_col(mt, def - 1, C.METHOD_PARAMLIST);
    if(def < mt.rows) {
        lastp = this.metadata_decode_row_col(mt, def, C.METHOD_PARAMLIST);
    }
    else {
        lastp = this.tables[C.TABLE_PARAM].rows + 1;
    }
    return { begin: idx, end: lastp };
};
Image.prototype.metadata_method_has_param_attrs = function(def) {
    var paramt = this.tables[C.TABLE_PARAM],
        range  = this.metadata_prepare_param_attrs(def),
        lastp  = range.end, i;
    for(i = range.begin; i < lastp; i++) {
        if( this.metadata_decode_row_col(paramt, i - 1, C.PARAM_FLAGS) ) {
            return true;
        }
    }
    return false;
};
Image.prototype.metadata_get_param_attrs = function(def, param_count) {
    var paramt = this.tables[C.TABLE_PARAM],
        range  = this.metadata_prepare_param_attrs(def),
        lastp  = range.end, i, cols, pattrs;

    for(i = range.begin; i < lastp; i++) {
        cols = this.metadata_decode_row(paramt, i - 1, C.PARAM_SIZE);
        if(cols[C.PARAM_FLAGS]) {
            if(!patts) pattrs = [];

            if(cols[C.PARAM_SEQUENCE] < param_count) {
                pattrs[ cols[C.PARAM_SEQUENCE] ] = cols[C.PARAM_FLAGS];
            }
        }
    }
    return pattrs;
};
Image.prototype.do_parse_type = function(t, container, serializable) {
    var ok = true, token, klass, etype;
    t.type = this.metadata_decode_value();
    switch(t.type) {
    case C.TYPE_VOID:
    case C.TYPE_BOOLEAN:
    case C.TYPE_CHAR:
    case C.TYPE_I1:
    case C.TYPE_U1:
    case C.TYPE_I2:
    case C.TYPE_U2:
    case C.TYPE_I4:
    case C.TYPE_U4:
    case C.TYPE_I8:
    case C.TYPE_U8:
    case C.TYPE_R4:
    case C.TYPE_R8:
    case C.TYPE_I:
    case C.TYPE_U:
    case C.TYPE_STRING:
    case C.TYPE_OBJECT:
    case C.TYPE_TYPEDBYREF:
        break;
    case C.TYPE_VALUETYPE:
    case C.TYPE_CLASS:
        token = this.metadata_parse_typedef_or_ref();
        klass = this.class_get_full(token, null);
        break;
    case C.TYPE_SZARRAY:
        TODO('type szarray');
        break;
    case C.TYPE_PTR:
        TODO('type ptr');
        break;
    case C.TYPE_FNPTR:
        TODO('type fnptr');
        break;
    case C.TYPE_ARRAY:
        TODO('type array');
        break;
    case C.TYPE_MVAR:
        TODO('type mvar');
        break;
    case C.TYPE_VAR:
        TODO('type var');
        break;
    case C.TYPE_GENERICINST:
        TODO('type genericinst');
        break;
    default:
        throw new Error("type " + t.type + " not handled in do_parse_type");
    }
};
Image.prototype.metadata_parse_type_internal = function(container, mode, opt_attrs, serializable, ptr)
{
    var type, cached,
        byref = false,
        pinned = false,
        count = 0,
        found = true;

    this.seek_set(ptr);
    while(found) {
        switch( this.peek_u8() ) {
        case C.TYPE_PINNED:
        case C.TYPE_BYREF:
            this.seek_cur(1);
            break;
        case C.TYPE_CMOD_REQD:
        case C.TYPE_CMOD_OPT:
            /* void */ this.metadata_parse_custom_mod(null, this.tell());
            count++;
            break;
       default:
           found = false;
            break;
        }
    }

    if(count) {
        TODO('custom modifiers in type');
    }
    else {
        type = new Type();
    }
    type.modifiers = [ ];

    found = true;
    count = 0;
    this.seek_set(ptr);
    while(found) {
        switch( this.peek_u8() ) {
        case C.TYPE_PINNED:
            pinned = true;
            this.seek_cur(1);
            break;
        case C.TYPE_BYREF:
            bytef = true;
            this.seek_cur(1);
            break;
        case C.TYPE_CMOD_REQD:
        case C.TYPE_CMOD_OPT:
            type.modifiers[count] = this.metadata_parse_custom_mod(this.tell());
            count++;
            break;
        default:
            found = false;
            break;
        }
    }

    type.attrs  = opt_attrs;
    type.byref  = byref;
    type.pinned = pinned;

    this.do_parse_type(type, container, serializable);
    return type;
};
Image.prototype.metadata_parse_type_full = function(container, mode, opt_attrs, ptr)
{
    return this.metadata_parse_type_internal(
        container, mode, opt_attrs, false, ptr);
};
Image.prototype.metadata_parse_method_signature_full = function(container, def, sig)
{
    var v, signature, i, pattrs,
        hasthis, explicit_this, call_convention, param_count,
        gen_param_count, is_open;

    this.seek_set(sig.data);
    v = this.read_u8();
    gen_param_count = !!(v & 0x10);
    hasthis         = !!(v & 0x20);
    explicit_this   = !!(v & 0x40);
    call_convention =    v & 0x0F;

    if(gen_param_count) {
        gen_param_count = this.metadata_decode_value();
    }
    param_count = this.metadata_decode_value();

    if(def) {
        pattrs = this.metadata_get_param_attrs(def, param_count + 1);
    }

    signature = new MethodSignature();
    signature.hasthis             = hasthis;
    signature.explicit_this       = explicit_this;
    signature.call_convention     = call_convention;
    signature.generic_param_count = gen_param_count;

    if(call_convention !== 0x0a) {
        signature.ret = this.metadata_parse_type_full(
            container,
            C.PARSE_RET,
            pattrs ? pattrs[0] : 0,
            this.tell()
        );
        is_open = false; // class_is_open_constructed_type
    }

    signature.params = [];
    for(i = 0; i < param_count; i++) {
        v = this.peek_u8();
        if(v === C.TYPE_SENTINEL) {
            if(call_convention !== C.CALL_VARARG || def) {
                throw new Error("found sentinel for methoddef or no vararg method");
            }
            if(signature.sentinelpos >= 0) {
                throw new Error("found sentinel twice in the same signature");
            }
            signature.sentinelpos = i;
            this.seek_cur(1);
        }
        signature.params[i] = this.metadata_parse_type_full(
            container, C.PARSE_PARAM, pattrs ? pattrs[i+1] : 0, this.tell()
        );
        if(!is_open) {
            is_open = false; // class_is_open_constructed_type
        }
    }

    if(signature.call_convention === C.CALL_VARARG) {
        if( (!def && signature.sentinelpos < 0) || def ) {
            signature.sentinelpos = signature.param_count;
        }
    }

    signature.has_type_parameters = is_open;

    return signature;
};
/**
 * @param {?GenericContainer} container
 * @param {number} ptr
 * @return {MethodHeader}
 */
Image.prototype.metadata_parse_mh_full = function(container, ptr) {
    var flags  = this.peek_u8(ptr);
    var format = (flags & C.METHOD_HEADER_FORMAT_MASK);
    var fat_flags;
    var local_var_sig_tok, max_stack, code_size, init_locals;
    var code;
    var hsize;
    var t = this.tables[C.TABLE_STANDALONESIG];
    var cols;
    var idx;
    var locals;
    var len, i, bsize;
    var mh = new MethodHeader();

    assert(ptr !== 0);

    this.seek_set(ptr);
    switch(format) {
    case C.METHOD_HEADER_TINY_FORMAT:
        this.seek_cur(1);
        mh.max_stack    = 8;
        mh.is_transient = true;
        mh.code_size    = flags >> 2;
        mh.code         = this.tell();
        return mh;
    case C.METHOD_HEADER_FAT_FORMAT:
        fat_flags         = this.read_u16();
        hsize             = (fat_flags >> 12) & 0x0f;
        max_stack         = this.read_u16();
        code_size         = this.read_u32();
        local_var_sig_tok = this.read_u32();
        code              = this.tell();
        init_locals = (fat_flags & C.METHOD_HEADER_INIT_LOCALS !== 0);

        if(!(fat_flags & C.METHOD_HEADER_MORE_SECTS)) {
            break;
        }
        this.seek_cur(code_size);
        break;
    default:
        throw new InvalidImage(format);
        //return null;
    }

    if(fat_flags & C.METHOD_HEADER_MORE_SECTS) {
        mh.clauses = this.parse_section_data(this.tell());
    }
    else {
        mh.clauses = null;
    }

    if(local_var_sig_tok) {
        idx = (local_var_sig_tok & 0xffffff) - 1;
        if(idx >= t.rows || idx < 0) {
            return null;
        }
        cols = this.metadata_decode_row(t, idx, 1);

        // TODO: verify standalone signature

        locals = this.metadata_decode_blob(cols[C.STAND_ALONE_SIGNATURE]);
        bsize  = locals.size;

        this.seek_set(locals.data);
        if( this.read_u8() !== 0x07 ) {
            warning("wrong signature for locals blob: " +
                    this.peek_u8(locals.data).toString(16));
        }

        len = this.metadata_decode_value();

        mh.locals = new Array(len);
        for(i = 0; i < len; i++) {
            mh.locals[i] = this.metadata_parse_type_internal(container,
                                                              C.PARSE_LOCAL,
                                                              9,
                                                              true,
                                                              this.tell());
            if(!mh.locals[i]) {
                return null;
            }
        }
    }

    mh.code         = code;
    mh.code_size    = code_size;
    mh.max_stack    = max_stack;
    mh.is_transient = true;
    mh.init_locals  = init_locals;

    return mh;
};

Image.prototype.class_create_from_typedef = function(type_token, context) {
    var tables = this.tables;
    var tdef = tables[C.TABLE_TYPEDEF];
    var klass, parent = null, cols, cols_next,
        tidx = this.metadata_token_index(type_token),
        context,
        name, nspace, icount, interfaces,
        field_last, method_last, nesting_token;

    assert(!(
        this.metadata_token_table(type_token) !== C.TABLE_TYPEDEF
        ||
        tidx > tdef.rows
    ));

    klass = this.class_cache[ type_token ];
    if(klass) {
        return klass;
    }
    cols = this.metadata_decode_row(tdef, tidx - 1, C.TYPEDEF_SIZE);

    name   = this.metadata_string_heap(cols[C.TYPEDEF_NAME]);
    nspace = this.metadata_string_heap(cols[C.TYPEDEF_NAMESPACE]);

    klass = new Class();
    klass.name       = name;
    klass.name_space = nspace;
    klass.image      = this;
    klass.type_token = type_token;
    klass.flags      = cols[C.TYPEDEF_FLAGS];

    this.class_cache[type_token] = klass;

    // TODO: this.metadata_load_generic_params
    klass.generic_container = null;

    if(cols[C.TYPEDEF_EXTENDS]) {
        parent = null; // TODO
    }
    //klass.setup_parent(parent);
    //klass.setup_type();

    // TODO: nesting

    if((klass.flags & C.TYPE_ATTRIBUTE_STRING_FORMAT_MASK)
             == C.TYPE_ATTRIBUTE_UNICODE_CLASS) {
        klass.unicode = true;
    }

    klass.cast_cllass = klass.elemen_class = klass;

    if(!klass.enumtype) {
        interfaces = this.metadata_interface_from_typedef_full(
            type_token, false, context);
        klass.interfaces = interfaces;
    }
    else {
        TODO('enumtype');
    }

    klass.field  = { first: cols[C.TYPEDEF_FIELD_LIST] - 1 };
    klass.method = { first: cols[C.TYPEDEF_METHOD_LIST] - 1 };

    if(tdef.rows > tidx) {
        cols_next    = this.metadata_decode_row(tdef, tidx, T.TYPEDEF_SIZE);
        field_last  = cols_next[C.TYPEDEF_FIELD_LIST] - 1;
        method_last = cols_next[C.TYPEDEF_METHOD_LIST] - 1;
    }
    else {
        field_last  = tables[C.TABLE_FIELD].rows;
        method_last = tables[C.TABLE_METHOD].rows;
    }

    if(cols[C.TYPEDEF_FIELD_LIST] <= tables[C.TABLE_FIELD].rows) {
        klass.field.count = field_last - klass.field.first;
    }
    else {
        klass.field.count = 0;
    }

    if(cols[C.TYPEDEF_METHOD_LIST] <= tables[C.TABLE_METHOD].rows) {
        klass.method.count = field_last - klass.method.first;
    }
    else {
        klass.method.count = 0;
    }

    if(klass.generic_container) {
        TODO('generic container');
    }

    return klass;
};
Image.prototype.class_from_typeref = function(type_token) {
    var cols;
    var t = this.tables[C.TABLE_TYPEREF];
    var rs;
    var idx;
    var name, nspace;
    var res;
    var module;

    // TODO: verify typedef row

    cols = this.metadata_decode_row(t, (type_token & 0xffffff)-1, C.TYPEREF_SIZE);

    name   = this.metadata_string_heap(cols[C.TYPEREF_NAME]);
    nspace = this.metadata_string_heap(cols[C.TYPEREF_NAMESPACE]);
    rs  = cols[C.TYPEREF_SCOPE];
    idx = rs >> C.RESOLTION_SCOPE_BITS;
    switch(rs & C.RESOLTION_SCOPE_MASK) {
    case C.RESOLTION_SCOPE_MODULE:
        if(!idx) throw new Error('null ResolutionScope not yet handled');
        return this.class_from_name(nspace, name);

    case C.RESOLTION_SCOPE_MODULEREF:
        module = image.load_module(idx);
        if(module) {
            return module.class_from_name(nspace, name);
        }
        else {
            throw new InvalidImage( (nspace.length ? nspace + '.' : '') + name);
        }
    case C.RESOLTION_SCOPE_TYPEREF:
        TODO('resolution scope typeref');
    case C.RESOLTION_SCOPE_ASSEMBLYREF:
        break;
    }

    if(idx > this.tables[C.TABLE_ASSEMBLYREF].rows) {
        throw new InvalidImage(idx);
    }

    // TODO: implement it!
    if(nspace === 'System' && name === 'Console') {
        return {
            namespace: nspace,
            name:      name,
        };
    }

    if(this.references[idx - 1] === undefined) {
        this.assembly_load_reference(idx - 1);
    }

    if(this.references[idx - 1] === C.REFERENCE_MISSING) {
        TODO('reference missing');
    }

    return this.references[idx - 1].class_from_name(nspace, name);
};
Image.prototype.class_get_full = function(type_token, context) {
    var klass;
    if(this.dynamic) {
        TODO('dynamic');
    }
    switch( this.metadata_token_code(type_token) ) {
    case C.TOKEN_TYPE_DEF:
        klass = this.class_create_from_typedef(type_token);
        break;
    case C.TOKEN_TYPE_REF:
        klass = this.class_from_typeref(type_token);
        break;
    case C.TOKEN_TYPE_SPEC:
        klass = this.class_create_from_typespec(type_token, context);
        break;
    default: throw new InvalidImage();
    }
    return klass;
};

Image.prototype.get_table_entries = function(t) { // for debugging
    var i, j, reader, a = new Array(t.rows),
        row, v, save;
    this.seek_set( t.base );

    reader = function(img, size) {
        switch(size) {
        case 1: return img.read_u8();
        case 2: return img.read_u16();
        case 4: return img.read_u32();
        default: throw new InvalidImage();
        }
    };
    for(i = 0; i < t.rows; i++) {
        row = {};
        for(j = 0; j < t.fields.length; j++) {
            switch(t.field_type[j]) {
            case MetaType.UINT8:
                v = this.read_u8();
                break;
            case MetaType.UINT16:
                v = this.read_u16();
                break;
            case MetaType.UINT32:
                v = this.read_u32();
                break;
            case MetaType.STRING_IDX:
                reader(this, t.field_size[j]);
                save = this.tell();
                v = this.load_cstring_from_string_heap(t, i, j);
                this.seek_set(save);
                break;
            default:
                v = reader(this, t.field_size[j]);
                break;
            }
            row[ t.fields[j] ] = v;
        }
        a[i] = row;
    }
    return a;
};
Image.prototype.get_table = function(name) { // for debugging
    for(var i in this.tables) {
        var t = this.tables[i];
        if(t.name === name) {
            return t;
        }
    }
    throw Error("Invalid table name: " + name);
};
Image.prototype.get_entry_point = function() {
    return this.image_info.cli_header.entry_point;
};
// @meradata/loader.c
Image.prototype.method_from_memberref = function(idx, context, used_context) {
    var klass = null;
    var method = null;
    var tables = this.tables;
    var cols;
    var nindex, mrclass, sig_idx;
    var mname;
    var sig;
    var ptr;

    cols = this.metadata_decode_row(tables[C.TABLE_MEMBERREF], idx-1,
                                    C.MEMBERREF_SIZE);
    nindex  = cols[C.MEMBERREF_CLASS] >> C.MEMBERREF_PARENT_BITS;
    mrclass = cols[C.MEMBERREF_CLASS] &  C.MEMBERREF_PARENT_MASK;

    mname = this.metadata_string_heap(cols[C.MEMBERREF_NAME]);

    if(used_context) {
        used_context.ok = (mrclass === C.MEMBERREF_PARENT_TYPESPEC);
    }

    switch(mrclass) {
    case C.MEMBERREF_PARENT_TYPEREF:
        klass = this.class_from_typeref(C.TOKEN_TYPE_REF | nindex);
        assert(klass);
        break;
    case C.MEMBERREF_PARENT_TYPESPEC:
        klass = this.class_get_full(C.TOKEN_TYPE_SPEC | nindex, context);
        assert(klass);
        break;
    case C.MEMBERREF_PARENT_TYPEDEF:
        klass = this.class_get(C.TOKEN_TYPE_SPEC | nindex);
        assert(klass);
        break;
    case C.MEMBERREF_PARENT_METHODREF:
        return this.get_method_full(C.TOKEN_METHOD_DEF | nindex, null, null);
        break;
    default:
        throw new InvalidImage('Memberref parent unknown: class: ' + mrclass);
    }

    assert(klass);

    //klass.init();

    sig_idx = cols[C.MEMBERREF_SIGNATURE];

    // TODO: verify memberref method signature

    ptr = this.metadata_decode_blob(sig_idx);

    // TODO: find the method

    return {
        XXX: 'System.Console::WriteLine',
        klass: klass,
    };
};
Image.prototype.get_method_from_token = function(token, klass, context, used_context) {
    var table  = this.metadata_token_table(token);
    var idx    = this.metadata_token_index(token);
    var tables = this.tables;
    var cols, iflags, flags, type, sig, method;

    if(this.dynamic) {
        TODO('dynamic');
    }
    if( table !== C.TABLE_METHOD ) {
        if(table === C.TABLE_METHODSPEC) {
            if(used_context) used_context.ok = true;
            return this.method_from_methodspec(context, idx);
        }
        else if(table !== C.TABLE_MEMBERREF) {
            throw new InvalidImage('got wrong token: ' + token);
        }
        return this.method_from_memberref(idx, context, used_context);
    }

    if(used_context) used_context.ok = false;

    assert( idx <= tables[C.TABLE_METHOD].rows );
    cols = this.metadata_decode_row(tables[C.TABLE_METHOD], idx - 1, cols,
                                    C.METHOD_SIZE);

    flags  = cols[C.METHOD_FLAGS];
    iflags = cols[C.METHOD_IMPLFLAGS];

    if(    (flags  & C.METHOD_ATTRIBUTE_PINVOKE_IMPL)
        || (iflags & C.METHOD_IMPL_ATTRIBUTE_INTERNAL_CALL) ) {
        method = new MethodPInvoke();
    }
    else {
        method = new Method();
    }

    if(!klass) {
        type  = this.metadata_typedef_from_method(token);
        assert(type === 2); // XXX for hello.exe
        klass = this.class_get_full(C.TOKEN_TYPE_DEF | type, null);
    }

    method.slot   = -1;
    method.klass  = klass;
    method.flags  = flags;
    method.iflags = iflags;
    method.token  = token;
    method.name   = this.metadata_string_heap(cols[C.METHOD_NAME]);

    method.wrapper_type = C.WRAPPER_NONE;

    sig = this.metadata_decode_blob(cols[C.METHOD_SIGNATURE]);
    if( this.peek_u8(sig.data) & 0x10 ) {
        TODO('generics');
    }

    if(iflags & C.METHOD_IMPL_ATTRIBUTE_INTERNAL_CALL) {
        TODO('internal call');
    }
    else if(flags & C.METHOD_ATTRIBUTE_PINVOKE_IMPL) {
        TODO('pinvoke');
    }

    return method;
};
Image.prototype.get_method_full = function(token, klass, context) {
    var cache, method, out;

    if( this.metadata_token_table(token) === C.TABLE_METHOD ) {
        cache = this.method_cache;
    }
    else {
        cache = this.methodref_cache;
    }
    method = cache[token];
    if(method) {
        return method;
    }
    out = {};
    method = this.get_method_from_token(token, klass, context, out);

    if(!out.used_context && !method.is_inflated) {
        cache[token] = method;
    }
    return method;
};
/**
 * @param {Type} type
 * @return {Class}
 */
Class.from_type = function(type) {
    return type;
};
Method.prototype.get_generic_container = function() {
    return null;
};
Method.prototype.get_header = function() {
    var image = this.klass.image;;
    var idx;
    var rva;
    var loc;
    var header;

    if( (this.flags & (C.METHOD_ATTRIBUTE_ABSTRACT | C.METHOD_ATTRIBUTE_PINVOKE_IMPL) )
       || (this.iflags & (C.METHOD_IMPL_ATTRIBUTE_RUNTIME | C.METHOD_IMPL_ATTRIBUTE_INTERNAL_CALL)) ) {
       return null;
    }

    if(this.is_inflated) {
       TODO('is_inflated');
    }

    if(this.wrapper_type !== C.WRAPPER_NONE || this.sre_method) {
       assert(this.header);
       return this.header;
    }

    assert( image.metadata_token_table(this.token) === C.TABLE_METHOD);

    idx = image.metadata_token_index(this.token);
    rva = image.metadata_decode_row_col(image.tables[C.TABLE_METHOD],
                                        idx - 1, C.METHOD_RVA);

    // TODO: verify method header

    loc = image.rva_map(rva);
    if(!loc) {
        return null;
    }
    return image.metadata_parse_mh_full( this.get_generic_container(), loc );
};
Method.prototype.signature = function() { // @metadata/loader.c
    var image, idx, sig, container,
        signature, sig_offset,
        can_cache_signature;
    if(this._signature) {
        return this._signature;
    }

    if(this.is_inflated) {
        TODO("method.is_inflated");
        signature = null; // TODO
    }

    image      = this.klass.image;
    idx        = image.metadata_token_index(this.token);
    sig_offset = image.metadata_decode_row_col(image.tables[C.TABLE_METHOD],
                                              idx - 1, C.METHOD_SIGNATURE);
    sig        = image.metadata_decode_blob(sig_offset);

    /* TODO
    container = method.get_generic_container();
    if(!container) {
        container = method.klass.generic_container;
    }
    */
    can_cache_signature = true;
    if(this.iflags & C.METHOD_IMPL_ATTRIBUTE_INTERNAL_CALL) {
        can_cache_signature = false;
    }
    else if(this.flags & C.METHOD_ATTRIBUTE_PINVOKE_IMPL) {
        can_cache_signature = false;
    }
    else if(container) {
        can_cache_signature = false;
    }
    else if(image.metadata_method_has_param_attrs(idx)) {
        can_cache_signature = false;
    }

    if(can_cache_signature) {
        signature = image.method_signatures[sig];
    }

    if(!signature) {
        signature = image.metadata_parse_method_signature_full(
            container, idx, sig);
        if(!signature) {
            throw new Error("Failed to load method signature");
        }

        if(can_cache_signature) {
            image.method_signatures[sig] = signature;
        }
    }

    if(signature.generic_param_count) {
        TODO('generics');
    }
    if(this.iflags & C.METHOD_IMPL_ATTRIBUTE_INTERNAL_CALL) {
        signature.pinvoke = true;
    }
    else if(this.flags & C.METHOD_ATTRIBUTE_PINVOKE_IMPL) {
        signature.pinvoke = true;
        TODO('pinvoke call convention');
    }

    this._signature = signature;
    return signature;
};

Image.prototype.run = function(args) { // ves_exec()@interpreter/interp.c
    var method = this.get_method_full(this.get_entry_point(), null, null);

    // runtime_run_main()@metaata/objcect.c
    var fullpath, sig, args;

    sig = method.signature();
    if(sig.param_count) {
        TODO('param');
    }
    else {
        args = new Array(0);
    }

    //this.assembly.set_main();
    return this.runtime_exec_main(method, args);
};
Image.prototype.runtime_exec_main = function(method, args) {
    this.invoke(method, null, []);
};
// see mono_interp_init()@interpreter/interp.c
// mono_runtime_invoke() -> interp_mono_runtime_invoke()@interpreter/interp.c
Image.prototype.invoke = function(method, obj, params) {
    var context         = null, //this.get_context(),
        current_context = new Context(),
        frame, old_frame,
        sig = method.signature(),
        klass = Class.from_type(sig.ret),
        i, isobject = false,
        retval, result, args = new Array(sig.param_count);

    frame = new Invocation();

    if(!context) {
        context                    = current_context;
        context.base_frame         = frame;
        context.current_frame      = null;
        context.env_frame          = frame;
        context.search_for_handler = 0;
        context.managed_code       = 0;
    }
    else {
        old_frame = context.current_frame;
    }

    //context.domain = Domain.get_instance();

    switch(sig.ret.type) {
    case C.TYPE_VOID:
        break;
	case C.TYPE_STRING:
	case C.TYPE_OBJECT:
	case C.TYPE_CLASS:
	case C.TYPE_ARRAY:
	case C.TYPE_SZARRAY:
		isobject = 1;
		break;
	case C.TYPE_VALUETYPE:
		retval = context.domain.object_new(klass);
		break;
	default:
		retval = context.domain.object_new(klass);
		break;
    }

    for(i = 0; i < sig.param_count; i++) {
        // TODO: data convertion
        args[i] = params[i];
    }

    if(method.flags & C.METHOD_ATTRIBUTE_PINVOKE_IMPL) {
        TODO('pinvoke');
    }

    result = new Object();
    frame.init(context.current_frame, args, obj, result, method);

    frame.exec_method_with_context(this, context);
};
// execute a method in VES (virtual execution system)
Invocation.prototype.exec_method_with_context = function(image, context) {
    var domain = Domain.get();
    var child_frame;
    var ip;
    var sp;
    var rtm;
    var method;
    var locals;
    var stack;
    var o;
    var c;
    var uv;
    var nv;
    var vt_sp

    this.ex               = null;
    this.ex_handler       = null;
    this.ip               = null;
    context.current_frame = this;

    if(!this.runtime_method.transformed) {
        this.runtime_method.transform_method(context);
    }

    rtm = this.runtime_method;
    this.args = [];

    stack  = [];
    locals = [];

    ip = rtm.code;

    // VES main loop
    while(true) main_loop: switch( image.peek_u8(ip) ) {
    case C.CEE_LDSTR: {
        ip++;
        uv = image.peek_u32( ip );
        stack.push( domain.ldstr(image, image.metadata_token_index(uv) ) );
        ip += 4;
        break;
    }
    case C.CEE_LDC_I4_M1: {
        ip++;
        stack.push(-1);
        break;
    }
    case C.CEE_LDC_I4_0: {
        ip++;
        stack.push(0);
        break;
    }
    case C.CEE_LDC_I4_1: {
        ip++;
        stack.push(1);
        break;
    }
    case C.CEE_LDC_I4_2: {
        ip++;
        stack.push(2);
        break;
    }
    case C.CEE_LDC_I4_3: {
        ip++;
        stack.push(3);
        break;
    }
    case C.CEE_LDC_I4_4: {
        ip++;
        stack.push(4);
        break;
    }
    case C.CEE_LDC_I4_5: {
        ip++;
        stack.push(5);
        break;
    }
    case C.CEE_LDC_I4_6: {
        ip++;
        stack.push(6);
        break;
    }
    case C.CEE_LDC_I4_7: {
        ip++;
        stack.push(7);
        break;
    }
    case C.CEE_LDC_I4_8: {
        ip++;
        stack.push(8);
        break;
    }
    case C.CEE_LDC_I4_S: {
        ip++;
        stack.push( image.peek_i8( ip ) );
        ip++;
        break;
    }
    case C.CEE_STLOC_0: {
        ip++;
        locals[0] = stack.pop();
        break;
    }
    case C.CEE_STLOC_1: {
        ip++;
        locals[1] = stack.pop();
        break;
    }
    case C.CEE_STLOC_2: {
        ip++;
        locals[2] = stack.pop();
        break;
    }
    case C.CEE_LDLOC_0: {
        ip++;
        stack.push( locals[0] );
        break;
    }
    case C.CEE_LDLOC_1: {
        ip++;
        stack.push( locals[1] );
        break;
    }
    case C.CEE_LDLOC_2: {
        ip++;
        stack.push( locals[2] );
        break;
    }
    case C.CEE_ADD: {
        ip++;
        nv = stack.pop();
        stack.push( stack.pop() + nv );
        break;
    }
    case C.CEE_SUB: {
        ip++;
        nv = stack.pop();
        stack.push( stack.pop() - nv );
        break;
    }

    case C.CEE_CALL: { // System.Console.WriteLine() only
        ip++;
        //method = image.get_method_full(image.peek_u32(ip), null, null);

        Clion.console.write_line( stack.pop() );
        ip += 4;
        break;
    }
    case C.CEE_RET: {
        return;
    }

    default:
        XXX( opcodes[ image.peek_u8(ip) ] );
    }
};
RuntimeMethod.prototype.transform_method = function(context) {
    var i, align, size, offset;
    var method    = this.method;
    var image     = method.klass.image;
    var header    = method.get_header();
    var signature = method.signature();
    var end;
    var u;
    var m;
    var klass;
    var domain = Domain.get();
    var is_bb_start;
    var ip, ins;
    var method_class_vt;
    var backwards;
    var generic_context;

    /*
    method_class_vt = method.klass.vtable();
    if(!method_class_vt.initialized) {

    }
    */

    if(method.iflags & (C.METHOD_IMPL_ATTRIBUTE_INTERNAL_CALL |  C.METHOD_IMPL_ATTRIBUTE_RUNTIME)) {
        TODO('internal call');
    }

    assert( signature.params.length + signature.hasthis < 1000 );
    assert( header.max_stack < 10000 );

    ip  = header.code;
    end = header.code + header.code_size;
    while( ip <  end) {
        ins = image.peek_u8(ip);
        if(ins === 0xfe) {
            ip++;
            ins = image.peek_u8(ip) + 256;
        }
        else if(ins === 0xf0) {
            ip++;
            ins = image.peek_u8(ip) + CEE_MONO_ICALL;
        }

        switch( opcodes[ins].argument ) {
        case C.InlineNone:
            ip++;
            break;
        case C.InlineString:
            if(method.wrapper_type === C.WRAPPER_NONE) {
                u = image.peek_u32( ip + 1 );
                domain.ldstr(image, image.metadata_token_index(u) );
            }
            ip += 5;
            break;
        case C.InlineType:
            TODO('type');
            ip += 5;
            break;
        case C.InlineMethod:
            if(method.wrapper_type === C.WRAPPER_NONE && ins !== C.CEE_CALLI) {
                m = image.get_method_full(image.peek_u32(ip+1), null,
                                          generic_context);
            }
            ip += 5;
            break;
        case C.InlineField:
        case C.InlineSig:
        case C.InlineI:
        case C.InlineTok:
        case C.ShortInlineR:
            ip += 5;
            break;
        case C.InlineBrTarget:
            TODO('br target');
            ip += 5;
            break;
        case C.ShortInlineBrTarget:
            TODO('short br target');
            ip += 2;
            break;
        case C.InlineVar:
            ip += 3;
            break;
        case C.ShortInlineVar:
        case C.ShortInlineI:
            ip += 2;
            break;
        case C.InlineSwitch:
            TODO('switch');
            break;
        case C.InlineR:
        case C.InlineI8:
            ip += 9;
            break;
        default:
            throw new ImvalidImage(ins);
        }
    }
    image.seek_set(ip);

    this.code         = header.code;
    this.code_size    = header.code_size;
    this.is_transient = header.is_transient;
    this.max_stack    = header.max_stack;

    this.transformed = true;
};

Image.prototype.dump = function() { // see dis_types()@dis/main.c
    var t   = this.tables[C.TABLE_TYPEDEF],
        i, flags, cols, cols_next,
        name, ns, o;

    for(i = 0; i < t.rows; i++) {
        o = {};
        cols = this.metadata_decode_row(t, i, C.TYPEDEF_SIZE);
        if(t.rows > i+1) {
            cols_next = this.metadata_decode_row(t, i+1, C.TYPEDEF_SIZE);
        }
        else {
            cols_next = null;
        }

        o.name = this.metadata_string_heap(cols[C.TYPEDEF_NAME]);
        o.ns   = this.metadata_string_heap(cols[C.TYPEDEF_NAMESPACE]);

        o.flags = cols[C.TYPEDEF_FLAGS];

        // TODO: load container

        if( (o.flags & C.TYPE_ATTRIBUTE_CLASS_SEMANTIC_MASK)
            === C.TYPE_ATTRIBUTE_CLASS ) {
            o.type = "class";
            // TODO: load generic param

            if(cols[C.TYPEDEF_EXTENDS]) {
                // TODO: .class extends
                var todo;
             }
        }
        else {
            XXX("not yet implemented: .class interface");
        }

        // TODO: cattrs
        // TODO: declarative security
        // TOOD: packing from typedef

        Dump(o);
    }
    XXX(t);
};

// The Clion application public interface
function Clion() {
};

Clion.version = VERSION;

Clion.console = {};
Clion.console.write_line = console.log;

Clion.load_from_view = function(view) {
    return new Image(view);
};











// export
module.exports = Clion;


});require.register("meta.js", function(module, exports, require, global){
/*
 This file is automatically generated by tool/meta.PL.
 */
// module meta
"use strict";
// auto-generated constants
/** @enum {int} */
var C = {
// metadata.h
  ASSEMBLY_HASH_ALG                : 0x0, // 0
  ASSEMBLY_PROCESSOR               : 0x0, // 0
  ASSEMBLY_MAJOR_VERSION           : 0x1, // 1
  ASSEMBLY_PROCESSOR_SIZE          : 0x1, // 1
  ASSEMBLY_MINOR_VERSION           : 0x2, // 2
  ASSEMBLY_BUILD_NUMBER            : 0x3, // 3
  ASSEMBLY_REV_NUMBER              : 0x4, // 4
  ASSEMBLY_FLAGS                   : 0x5, // 5
  ASSEMBLY_PUBLIC_KEY              : 0x6, // 6
  ASSEMBLY_NAME                    : 0x7, // 7
  ASSEMBLY_CULTURE                 : 0x8, // 8
  ASSEMBLY_SIZE                    : 0x9, // 9
  ASSEMBLYOS_PLATFORM              : 0x0, // 0
  ASSEMBLYOS_MAJOR_VERSION         : 0x1, // 1
  ASSEMBLYOS_MINOR_VERSION         : 0x2, // 2
  ASSEMBLYOS_SIZE                  : 0x3, // 3
  ASSEMBLYREF_MAJOR_VERSION        : 0x0, // 0
  ASSEMBLYREF_MINOR_VERSION        : 0x1, // 1
  ASSEMBLYREF_BUILD_NUMBER         : 0x2, // 2
  ASSEMBLYREF_REV_NUMBER           : 0x3, // 3
  ASSEMBLYREF_FLAGS                : 0x4, // 4
  ASSEMBLYREF_PUBLIC_KEY           : 0x5, // 5
  ASSEMBLYREF_NAME                 : 0x6, // 6
  ASSEMBLYREF_CULTURE              : 0x7, // 7
  ASSEMBLYREF_HASH_VALUE           : 0x8, // 8
  ASSEMBLYREF_SIZE                 : 0x9, // 9
  ASSEMBLYREFOS_PLATFORM           : 0x0, // 0
  ASSEMBLYREFOS_MAJOR_VERSION      : 0x1, // 1
  ASSEMBLYREFOS_MINOR_VERSION      : 0x2, // 2
  ASSEMBLYREFOS_ASSEMBLYREF        : 0x3, // 3
  ASSEMBLYREFOS_SIZE               : 0x4, // 4
  ASSEMBLYREFPROC_PROCESSOR        : 0x0, // 0
  ASSEMBLYREFPROC_ASSEMBLYREF      : 0x1, // 1
  ASSEMBLYREFPROC_SIZE             : 0x2, // 2
  BEGIN_DECLS                      : 0x1, // 1
  CALL_DEFAULT                     : 0x0, // 0
  CALL_C                           : 0x1, // 1
  CALL_STDCALL                     : 0x2, // 2
  CALL_THISCALL                    : 0x3, // 3
  CALL_FASTCALL                    : 0x4, // 4
  CALL_VARARG                      : 0x5, // 5
  CLASS_LAYOUT_PACKING_SIZE        : 0x0, // 0
  CLASS_LAYOUT_CLASS_SIZE          : 0x1, // 1
  CLASS_LAYOUT_PARENT              : 0x2, // 2
  CLASS_LAYOUT_SIZE                : 0x3, // 3
  CONSTANT_TYPE                    : 0x0, // 0
  CONSTANT_PADDING                 : 0x1, // 1
  CONSTANT_PARENT                  : 0x2, // 2
  CONSTANT_VALUE                   : 0x3, // 3
  CONSTANT_SIZE                    : 0x4, // 4
  CUSTOM_ATTR_METHODDEF            : 0x0, // 0
  CUSTOM_ATTR_PARENT               : 0x0, // 0
  CUSTOM_ATTR_TYPE_TYPEREF         : 0x0, // 0
  CUSTOM_ATTR_FIELDDEF             : 0x1, // 1
  CUSTOM_ATTR_TYPE                 : 0x1, // 1
  CUSTOM_ATTR_TYPE_TYPEDEF         : 0x1, // 1
  CUSTOM_ATTR_TYPEREF              : 0x2, // 2
  CUSTOM_ATTR_TYPE_METHODDEF       : 0x2, // 2
  CUSTOM_ATTR_VALUE                : 0x2, // 2
  CUSTOM_ATTR_SIZE                 : 0x3, // 3
  CUSTOM_ATTR_TYPEDEF              : 0x3, // 3
  CUSTOM_ATTR_TYPE_BITS            : 0x3, // 3
  CUSTOM_ATTR_TYPE_MEMBERREF       : 0x3, // 3
  CUSTOM_ATTR_PARAMDEF             : 0x4, // 4
  CUSTOM_ATTR_TYPE_STRING          : 0x4, // 4
  CUSTOM_ATTR_BITS                 : 0x5, // 5
  CUSTOM_ATTR_INTERFACE            : 0x5, // 5
  CUSTOM_ATTR_MEMBERREF            : 0x6, // 6
  CUSTOM_ATTR_MODULE               : 0x7, // 7
  CUSTOM_ATTR_TYPE_MASK            : 0x7, // 7
  CUSTOM_ATTR_PERMISSION           : 0x8, // 8
  CUSTOM_ATTR_PROPERTY             : 0x9, // 9
  CUSTOM_ATTR_EVENT                : 0xa, // 10
  CUSTOM_ATTR_SIGNATURE            : 0xb, // 11
  CUSTOM_ATTR_MODULEREF            : 0xc, // 12
  CUSTOM_ATTR_TYPESPEC             : 0xd, // 13
  CUSTOM_ATTR_ASSEMBLY             : 0xe, // 14
  CUSTOM_ATTR_ASSEMBLYREF          : 0xf, // 15
  CUSTOM_ATTR_FILE                 : 0x10, // 16
  CUSTOM_ATTR_EXP_TYPE             : 0x11, // 17
  CUSTOM_ATTR_MANIFEST             : 0x12, // 18
  CUSTOM_ATTR_GENERICPAR           : 0x13, // 19
  CUSTOM_ATTR_MASK                 : 0x1f, // 31
  DECL_SECURITY_ACTION             : 0x0, // 0
  DECL_SECURITY_PARENT             : 0x1, // 1
  DECL_SECURITY_PERMISSIONSET      : 0x2, // 2
  DECL_SECURITY_SIZE               : 0x3, // 3
  END_DECLS                        : 0x1, // 1
  EVENT_FLAGS                      : 0x0, // 0
  EVENT_MAP_PARENT                 : 0x0, // 0
  EVENT_POINTER_EVENT              : 0x0, // 0
  EVENT_MAP_EVENTLIST              : 0x1, // 1
  EVENT_NAME                       : 0x1, // 1
  EVENT_POINTER_SIZE               : 0x1, // 1
  EVENT_MAP_SIZE                   : 0x2, // 2
  EVENT_TYPE                       : 0x2, // 2
  EVENT_SIZE                       : 0x3, // 3
  EXCEPTION_CLAUSE_NONE            : 0x0, // 0
  EXCEPTION_CLAUSE_FILTER          : 0x1, // 1
  EXCEPTION_CLAUSE_FINALLY         : 0x2, // 2
  EXCEPTION_CLAUSE_FAULT           : 0x4, // 4
  EXP_TYPE_FLAGS                   : 0x0, // 0
  EXP_TYPE_TYPEDEF                 : 0x1, // 1
  EXP_TYPE_NAME                    : 0x2, // 2
  EXP_TYPE_NAMESPACE               : 0x3, // 3
  EXP_TYPE_IMPLEMENTATION          : 0x4, // 4
  EXP_TYPE_SIZE                    : 0x5, // 5
  FIELD_FLAGS                      : 0x0, // 0
  FIELD_LAYOUT_OFFSET              : 0x0, // 0
  FIELD_MARSHAL_PARENT             : 0x0, // 0
  FIELD_POINTER_FIELD              : 0x0, // 0
  FIELD_RVA_RVA                    : 0x0, // 0
  FIELD_LAYOUT_FIELD               : 0x1, // 1
  FIELD_MARSHAL_NATIVE_TYPE        : 0x1, // 1
  FIELD_NAME                       : 0x1, // 1
  FIELD_POINTER_SIZE               : 0x1, // 1
  FIELD_RVA_FIELD                  : 0x1, // 1
  FIELD_LAYOUT_SIZE                : 0x2, // 2
  FIELD_MARSHAL_SIZE               : 0x2, // 2
  FIELD_RVA_SIZE                   : 0x2, // 2
  FIELD_SIGNATURE                  : 0x2, // 2
  FIELD_SIZE                       : 0x3, // 3
  FILE_FLAGS                       : 0x0, // 0
  FILE_NAME                        : 0x1, // 1
  FILE_HASH_VALUE                  : 0x2, // 2
  FILE_SIZE                        : 0x3, // 3
  GENERICPARAM_NUMBER              : 0x0, // 0
  GENERICPARAM_FLAGS               : 0x1, // 1
  GENERICPARAM_OWNER               : 0x2, // 2
  GENERICPARAM_NAME                : 0x3, // 3
  GENERICPARAM_SIZE                : 0x4, // 4
  GENPARCONSTRAINT_GENERICPAR      : 0x0, // 0
  GENPARCONSTRAINT_CONSTRAINT      : 0x1, // 1
  GENPARCONSTRAINT_SIZE            : 0x2, // 2
  HAS_DECL_SECURITY_TYPEDEF        : 0x0, // 0
  HAS_FIELD_MARSHAL_FIELDSREF      : 0x0, // 0
  HAS_SEMANTICS_EVENT              : 0x0, // 0
  HAS_DECL_SECURITY_METHODDEF      : 0x1, // 1
  HAS_FIELD_MARSHAL_BITS           : 0x1, // 1
  HAS_FIELD_MARSHAL_MASK           : 0x1, // 1
  HAS_FIELD_MARSHAL_PARAMDEF       : 0x1, // 1
  HAS_SEMANTICS_BITS               : 0x1, // 1
  HAS_SEMANTICS_MASK               : 0x1, // 1
  HAS_SEMANTICS_PROPERTY           : 0x1, // 1
  HAS_DECL_SECURITY_ASSEMBLY       : 0x2, // 2
  HAS_DECL_SECURITY_BITS           : 0x2, // 2
  HAS_DECL_SECURITY_MASK           : 0x3, // 3
  HASCONSTANT_FIEDDEF              : 0x0, // 0
  HASCONSTANT_PARAM                : 0x1, // 1
  HASCONSTANT_BITS                 : 0x2, // 2
  HASCONSTANT_PROPERTY             : 0x2, // 2
  HASCONSTANT_MASK                 : 0x3, // 3
  IMAGE_OK                         : 0x0, // 0
  IMAGE_ERROR_ERRNO                : 0x1, // 1
  IMAGE_MISSING_ASSEMBLYREF        : 0x2, // 2
  IMAGE_IMAGE_INVALID              : 0x3, // 3
  IMPLEMENTATION_FILE              : 0x0, // 0
  IMPLEMENTATION_ASSEMBLYREF       : 0x1, // 1
  IMPLEMENTATION_BITS              : 0x2, // 2
  IMPLEMENTATION_EXP_TYPE          : 0x2, // 2
  IMPLEMENTATION_MASK              : 0x3, // 3
  IMPLMAP_FLAGS                    : 0x0, // 0
  IMPLMAP_MEMBER                   : 0x1, // 1
  IMPLMAP_NAME                     : 0x2, // 2
  IMPLMAP_SCOPE                    : 0x3, // 3
  IMPLMAP_SIZE                     : 0x4, // 4
  INTERFACEIMPL_CLASS              : 0x0, // 0
  INTERFACEIMPL_INTERFACE          : 0x1, // 1
  INTERFACEIMPL_SIZE               : 0x2, // 2
  MANIFEST_OFFSET                  : 0x0, // 0
  MANIFEST_FLAGS                   : 0x1, // 1
  MANIFEST_NAME                    : 0x2, // 2
  MANIFEST_IMPLEMENTATION          : 0x3, // 3
  MANIFEST_SIZE                    : 0x4, // 4
  MARSHAL_CONV_NONE                : 0x0, // 0
  MARSHAL_CONV_BOOL_VARIANTBOOL    : 0x1, // 1
  MARSHAL_CONV_BOOL_I4             : 0x2, // 2
  MARSHAL_CONV_STR_BSTR            : 0x3, // 3
  MARSHAL_CONV_STR_LPSTR           : 0x4, // 4
  MARSHAL_CONV_LPSTR_STR           : 0x5, // 5
  MARSHAL_CONV_LPTSTR_STR          : 0x6, // 6
  MARSHAL_CONV_STR_LPWSTR          : 0x7, // 7
  MARSHAL_CONV_LPWSTR_STR          : 0x8, // 8
  MARSHAL_CONV_STR_LPTSTR          : 0x9, // 9
  MARSHAL_CONV_STR_ANSIBSTR        : 0xa, // 10
  MARSHAL_CONV_STR_TBSTR           : 0xb, // 11
  MARSHAL_CONV_STR_BYVALSTR        : 0xc, // 12
  MARSHAL_CONV_STR_BYVALWSTR       : 0xd, // 13
  MARSHAL_CONV_SB_LPSTR            : 0xe, // 14
  MARSHAL_CONV_SB_LPTSTR           : 0xf, // 15
  MARSHAL_CONV_SB_LPWSTR           : 0x10, // 16
  MARSHAL_CONV_LPSTR_SB            : 0x11, // 17
  MARSHAL_CONV_LPTSTR_SB           : 0x12, // 18
  MARSHAL_CONV_LPWSTR_SB           : 0x13, // 19
  MARSHAL_CONV_ARRAY_BYVALARRAY    : 0x14, // 20
  MARSHAL_CONV_ARRAY_BYVALCHARARRAY: 0x15, // 21
  MARSHAL_CONV_ARRAY_SAVEARRAY     : 0x16, // 22
  MARSHAL_CONV_ARRAY_LPARRAY       : 0x17, // 23
  MARSHAL_FREE_LPARRAY             : 0x18, // 24
  MARSHAL_CONV_OBJECT_INTERFACE    : 0x19, // 25
  MARSHAL_CONV_OBJECT_IDISPATCH    : 0x1a, // 26
  MARSHAL_CONV_OBJECT_IUNKNOWN     : 0x1b, // 27
  MARSHAL_CONV_OBJECT_STRUCT       : 0x1c, // 28
  MARSHAL_CONV_DEL_FTN             : 0x1d, // 29
  MARSHAL_CONV_FTN_DEL             : 0x1e, // 30
  MARSHAL_FREE_ARRAY               : 0x1f, // 31
  MARSHAL_CONV_BSTR_STR            : 0x20, // 32
  MARSHAL_CONV_SAFEHANDLE          : 0x21, // 33
  MARSHAL_CONV_HANDLEREF           : 0x22, // 34
  MEMBERFORWD_FIELDDEF             : 0x0, // 0
  MEMBERFORWD_BITS                 : 0x1, // 1
  MEMBERFORWD_MASK                 : 0x1, // 1
  MEMBERFORWD_METHODDEF            : 0x1, // 1
  MEMBERREF_CLASS                  : 0x0, // 0
  MEMBERREF_PARENT_TYPEDEF         : 0x0, // 0
  MEMBERREF_NAME                   : 0x1, // 1
  MEMBERREF_PARENT_TYPEREF         : 0x1, // 1
  MEMBERREF_PARENT_MODULEREF       : 0x2, // 2
  MEMBERREF_SIGNATURE              : 0x2, // 2
  MEMBERREF_PARENT_BITS            : 0x3, // 3
  MEMBERREF_PARENT_METHODDEF       : 0x3, // 3
  MEMBERREF_SIZE                   : 0x3, // 3
  MEMBERREF_PARENT_TYPESPEC        : 0x4, // 4
  MEMBERREF_PARENT_MASK            : 0x7, // 7
  METHOD_POINTER_METHOD            : 0x0, // 0
  METHOD_RVA                       : 0x0, // 0
  METHOD_SEMA_SEMANTICS            : 0x0, // 0
  METHOD_IMPLFLAGS                 : 0x1, // 1
  METHOD_POINTER_SIZE              : 0x1, // 1
  METHOD_SEMA_METHOD               : 0x1, // 1
  METHOD_FLAGS                     : 0x2, // 2
  METHOD_SEMA_ASSOCIATION          : 0x2, // 2
  METHOD_NAME                      : 0x3, // 3
  METHOD_SEMA_SIZE                 : 0x3, // 3
  METHOD_SIGNATURE                 : 0x4, // 4
  METHOD_PARAMLIST                 : 0x5, // 5
  METHOD_SIZE                      : 0x6, // 6
  METHODDEFORREF_METHODDEF         : 0x0, // 0
  METHODDEFORREF_BITS              : 0x1, // 1
  METHODDEFORREF_MASK              : 0x1, // 1
  METHODDEFORREF_METHODREF         : 0x1, // 1
  METHODIMPL_CLASS                 : 0x0, // 0
  METHODIMPL_BODY                  : 0x1, // 1
  METHODIMPL_DECLARATION           : 0x2, // 2
  METHODIMPL_SIZE                  : 0x3, // 3
  METHODSPEC_METHOD                : 0x0, // 0
  METHODSPEC_SIGNATURE             : 0x1, // 1
  METHODSPEC_SIZE                  : 0x2, // 2
  MODULE_GENERATION                : 0x0, // 0
  MODULE_NAME                      : 0x1, // 1
  MODULE_MVID                      : 0x2, // 2
  MODULE_ENC                       : 0x3, // 3
  MODULE_ENCBASE                   : 0x4, // 4
  MODULE_SIZE                      : 0x5, // 5
  MODULEREF_NAME                   : 0x0, // 0
  MODULEREF_SIZE                   : 0x1, // 1
  NATIVE_BOOLEAN                   : 0x2, // 2
  NATIVE_I1                        : 0x3, // 3
  NATIVE_U1                        : 0x4, // 4
  NATIVE_I2                        : 0x5, // 5
  NATIVE_U2                        : 0x6, // 6
  NATIVE_I4                        : 0x7, // 7
  NATIVE_U4                        : 0x8, // 8
  NATIVE_I8                        : 0x9, // 9
  NATIVE_U8                        : 0xa, // 10
  NATIVE_R4                        : 0xb, // 11
  NATIVE_R8                        : 0xc, // 12
  NATIVE_CURRENCY                  : 0xf, // 15
  NATIVE_BSTR                      : 0x13, // 19
  NATIVE_LPSTR                     : 0x14, // 20
  NATIVE_LPWSTR                    : 0x15, // 21
  NATIVE_LPTSTR                    : 0x16, // 22
  NATIVE_BYVALTSTR                 : 0x17, // 23
  NATIVE_IUNKNOWN                  : 0x19, // 25
  NATIVE_IDISPATCH                 : 0x1a, // 26
  NATIVE_STRUCT                    : 0x1b, // 27
  NATIVE_INTERFACE                 : 0x1c, // 28
  NATIVE_SAFEARRAY                 : 0x1d, // 29
  NATIVE_BYVALARRAY                : 0x1e, // 30
  NATIVE_INT                       : 0x1f, // 31
  NATIVE_UINT                      : 0x20, // 32
  NATIVE_VBBYREFSTR                : 0x22, // 34
  NATIVE_ANSIBSTR                  : 0x23, // 35
  NATIVE_TBSTR                     : 0x24, // 36
  NATIVE_VARIANTBOOL               : 0x25, // 37
  NATIVE_FUNC                      : 0x26, // 38
  NATIVE_ASANY                     : 0x28, // 40
  NATIVE_LPARRAY                   : 0x2a, // 42
  NATIVE_LPSTRUCT                  : 0x2b, // 43
  NATIVE_CUSTOM                    : 0x2c, // 44
  NATIVE_ERROR                     : 0x2d, // 45
  NATIVE_MAX                       : 0x50, // 80
  NESTED_CLASS_NESTED              : 0x0, // 0
  NESTED_CLASS_ENCLOSING           : 0x1, // 1
  NESTED_CLASS_SIZE                : 0x2, // 2
  PARAM_FLAGS                      : 0x0, // 0
  PARAM_POINTER_PARAM              : 0x0, // 0
  PARAM_POINTER_SIZE               : 0x1, // 1
  PARAM_SEQUENCE                   : 0x1, // 1
  PARAM_NAME                       : 0x2, // 2
  PARAM_SIZE                       : 0x3, // 3
  PARSE_TYPE                       : 0x0, // 0
  PARSE_MOD_TYPE                   : 0x1, // 1
  PARSE_LOCAL                      : 0x2, // 2
  PARSE_PARAM                      : 0x3, // 3
  PARSE_RET                        : 0x4, // 4
  PARSE_FIELD                      : 0x5, // 5
  PROPERTY_FLAGS                   : 0x0, // 0
  PROPERTY_MAP_PARENT              : 0x0, // 0
  PROPERTY_POINTER_PROPERTY        : 0x0, // 0
  PROPERTY_MAP_PROPERTY_LIST       : 0x1, // 1
  PROPERTY_NAME                    : 0x1, // 1
  PROPERTY_POINTER_SIZE            : 0x1, // 1
  PROPERTY_MAP_SIZE                : 0x2, // 2
  PROPERTY_TYPE                    : 0x2, // 2
  PROPERTY_SIZE                    : 0x3, // 3
  RESOLTION_SCOPE_MODULE           : 0x0, // 0
  RESOLTION_SCOPE_MODULEREF        : 0x1, // 1
  RESOLTION_SCOPE_ASSEMBLYREF      : 0x2, // 2
  RESOLTION_SCOPE_BITS             : 0x2, // 2
  RESOLTION_SCOPE_MASK             : 0x3, // 3
  RESOLTION_SCOPE_TYPEREF          : 0x3, // 3
  STAND_ALONE_SIGNATURE            : 0x0, // 0
  STAND_ALONE_SIGNATURE_SIZE       : 0x1, // 1
  TABLE_MODULE                     : 0x0, // 0
  TABLE_TYPEREF                    : 0x1, // 1
  TABLE_TYPEDEF                    : 0x2, // 2
  TABLE_FIELD_POINTER              : 0x3, // 3
  TABLE_FIELD                      : 0x4, // 4
  TABLE_METHOD_POINTER             : 0x5, // 5
  TABLE_METHOD                     : 0x6, // 6
  TABLE_PARAM_POINTER              : 0x7, // 7
  TABLE_PARAM                      : 0x8, // 8
  TABLE_INTERFACEIMPL              : 0x9, // 9
  TABLE_MEMBERREF                  : 0xa, // 10
  TABLE_CONSTANT                   : 0xb, // 11
  TABLE_CUSTOMATTRIBUTE            : 0xc, // 12
  TABLE_FIELDMARSHAL               : 0xd, // 13
  TABLE_DECLSECURITY               : 0xe, // 14
  TABLE_CLASSLAYOUT                : 0xf, // 15
  TABLE_FIELDLAYOUT                : 0x10, // 16
  TABLE_STANDALONESIG              : 0x11, // 17
  TABLE_EVENTMAP                   : 0x12, // 18
  TABLE_EVENT_POINTER              : 0x13, // 19
  TABLE_EVENT                      : 0x14, // 20
  TABLE_PROPERTYMAP                : 0x15, // 21
  TABLE_PROPERTY_POINTER           : 0x16, // 22
  TABLE_PROPERTY                   : 0x17, // 23
  TABLE_METHODSEMANTICS            : 0x18, // 24
  TABLE_METHODIMPL                 : 0x19, // 25
  TABLE_MODULEREF                  : 0x1a, // 26
  TABLE_TYPESPEC                   : 0x1b, // 27
  TABLE_IMPLMAP                    : 0x1c, // 28
  TABLE_FIELDRVA                   : 0x1d, // 29
  TABLE_UNUSED6                    : 0x1e, // 30
  TABLE_UNUSED7                    : 0x1f, // 31
  TABLE_ASSEMBLY                   : 0x20, // 32
  TABLE_ASSEMBLYPROCESSOR          : 0x21, // 33
  TABLE_ASSEMBLYOS                 : 0x22, // 34
  TABLE_ASSEMBLYREF                : 0x23, // 35
  TABLE_ASSEMBLYREFPROCESSOR       : 0x24, // 36
  TABLE_ASSEMBLYREFOS              : 0x25, // 37
  TABLE_FILE                       : 0x26, // 38
  TABLE_EXPORTEDTYPE               : 0x27, // 39
  TABLE_MANIFESTRESOURCE           : 0x28, // 40
  TABLE_NESTEDCLASS                : 0x29, // 41
  TABLE_GENERICPARAM               : 0x2a, // 42
  TABLE_METHODSPEC                 : 0x2b, // 43
  TABLE_GENERICPARAMCONSTRAINT     : 0x2c, // 44
  TABLE_LAST                       : 0x2c, // 44
  TYPE_END                         : 0x0, // 0
  TYPE_VOID                        : 0x1, // 1
  TYPE_BOOLEAN                     : 0x2, // 2
  TYPE_CHAR                        : 0x3, // 3
  TYPE_I1                          : 0x4, // 4
  TYPE_U1                          : 0x5, // 5
  TYPE_I2                          : 0x6, // 6
  TYPE_U2                          : 0x7, // 7
  TYPE_I4                          : 0x8, // 8
  TYPE_U4                          : 0x9, // 9
  TYPE_I8                          : 0xa, // 10
  TYPE_U8                          : 0xb, // 11
  TYPE_R4                          : 0xc, // 12
  TYPE_R8                          : 0xd, // 13
  TYPE_STRING                      : 0xe, // 14
  TYPE_PTR                         : 0xf, // 15
  TYPE_BYREF                       : 0x10, // 16
  TYPE_VALUETYPE                   : 0x11, // 17
  TYPE_CLASS                       : 0x12, // 18
  TYPE_VAR                         : 0x13, // 19
  TYPE_ARRAY                       : 0x14, // 20
  TYPE_GENERICINST                 : 0x15, // 21
  TYPE_TYPEDBYREF                  : 0x16, // 22
  TYPE_I                           : 0x18, // 24
  TYPE_U                           : 0x19, // 25
  TYPE_FNPTR                       : 0x1b, // 27
  TYPE_OBJECT                      : 0x1c, // 28
  TYPE_SZARRAY                     : 0x1d, // 29
  TYPE_MVAR                        : 0x1e, // 30
  TYPE_CMOD_REQD                   : 0x1f, // 31
  TYPE_CMOD_OPT                    : 0x20, // 32
  TYPE_INTERNAL                    : 0x21, // 33
  TYPE_MODIFIER                    : 0x40, // 64
  TYPE_SENTINEL                    : 0x41, // 65
  TYPE_PINNED                      : 0x45, // 69
  TYPE_ENUM                        : 0x55, // 85
  TYPEDEF_FLAGS                    : 0x0, // 0
  TYPEDEF_NAME                     : 0x1, // 1
  TYPEDEF_NAMESPACE                : 0x2, // 2
  TYPEDEF_EXTENDS                  : 0x3, // 3
  TYPEDEF_FIELD_LIST               : 0x4, // 4
  TYPEDEF_METHOD_LIST              : 0x5, // 5
  TYPEDEF_SIZE                     : 0x6, // 6
  TYPEDEFORREF_TYPEDEF             : 0x0, // 0
  TYPEDEFORREF_TYPEREF             : 0x1, // 1
  TYPEDEFORREF_BITS                : 0x2, // 2
  TYPEDEFORREF_TYPESPEC            : 0x2, // 2
  TYPEDEFORREF_MASK                : 0x3, // 3
  TYPEORMETHOD_TYPE                : 0x0, // 0
  TYPEORMETHOD_BITS                : 0x1, // 1
  TYPEORMETHOD_MASK                : 0x1, // 1
  TYPEORMETHOD_METHOD              : 0x1, // 1
  TYPEREF_SCOPE                    : 0x0, // 0
  TYPEREF_NAME                     : 0x1, // 1
  TYPEREF_NAMESPACE                : 0x2, // 2
  TYPEREF_SIZE                     : 0x3, // 3
  TYPESPEC_SIGNATURE               : 0x0, // 0
  TYPESPEC_SIZE                    : 0x1, // 1
  VARIANT_EMPTY                    : 0x0, // 0
  VARIANT_NULL                     : 0x1, // 1
  VARIANT_I2                       : 0x2, // 2
  VARIANT_I4                       : 0x3, // 3
  VARIANT_R4                       : 0x4, // 4
  VARIANT_R8                       : 0x5, // 5
  VARIANT_CY                       : 0x6, // 6
  VARIANT_DATE                     : 0x7, // 7
  VARIANT_BSTR                     : 0x8, // 8
  VARIANT_DISPATCH                 : 0x9, // 9
  VARIANT_ERROR                    : 0xa, // 10
  VARIANT_BOOL                     : 0xb, // 11
  VARIANT_VARIANT                  : 0xc, // 12
  VARIANT_UNKNOWN                  : 0xd, // 13
  VARIANT_DECIMAL                  : 0xe, // 14
  VARIANT_I1                       : 0x10, // 16
  VARIANT_UI1                      : 0x11, // 17
  VARIANT_UI2                      : 0x12, // 18
  VARIANT_UI4                      : 0x13, // 19
  VARIANT_I8                       : 0x14, // 20
  VARIANT_UI8                      : 0x15, // 21
  VARIANT_INT                      : 0x16, // 22
  VARIANT_UINT                     : 0x17, // 23
  VARIANT_VOID                     : 0x18, // 24
  VARIANT_HRESULT                  : 0x19, // 25
  VARIANT_PTR                      : 0x1a, // 26
  VARIANT_SAFEARRAY                : 0x1b, // 27
  VARIANT_CARRAY                   : 0x1c, // 28
  VARIANT_USERDEFINED              : 0x1d, // 29
  VARIANT_LPSTR                    : 0x1e, // 30
  VARIANT_LPWSTR                   : 0x1f, // 31
  VARIANT_RECORD                   : 0x24, // 36
  VARIANT_FILETIME                 : 0x40, // 64
  VARIANT_BLOB                     : 0x41, // 65
  VARIANT_STREAM                   : 0x42, // 66
  VARIANT_STORAGE                  : 0x43, // 67
  VARIANT_STREAMED_OBJECT          : 0x44, // 68
  VARIANT_STORED_OBJECT            : 0x45, // 69
  VARIANT_BLOB_OBJECT              : 0x46, // 70
  VARIANT_CF                       : 0x47, // 71
  VARIANT_CLSID                    : 0x48, // 72
  VARIANT_VECTOR                   : 0x1000, // 4096
  VARIANT_ARRAY                    : 0x2000, // 8192
  VARIANT_BYREF                    : 0x4000, // 16384
  ZERO_LEN_ARRAY                   : 0x0, // 0
// tokentype.h
  TOKEN_MODULE           : 0x0, // 0
  TOKEN_TYPE_REF         : 0x1000000, // 16777216
  TOKEN_TYPE_DEF         : 0x2000000, // 33554432
  TOKEN_FIELD_DEF        : 0x4000000, // 67108864
  TOKEN_METHOD_DEF       : 0x6000000, // 100663296
  TOKEN_PARAM_DEF        : 0x8000000, // 134217728
  TOKEN_INTERFACE_IMPL   : 0x9000000, // 150994944
  TOKEN_MEMBER_REF       : 0xa000000, // 167772160
  TOKEN_CUSTOM_ATTRIBUTE : 0xc000000, // 201326592
  TOKEN_PERMISSION       : 0xe000000, // 234881024
  TOKEN_SIGNATURE        : 0x11000000, // 285212672
  TOKEN_EVENT            : 0x14000000, // 335544320
  TOKEN_PROPERTY         : 0x17000000, // 385875968
  TOKEN_MODULE_REF       : 0x1a000000, // 436207616
  TOKEN_TYPE_SPEC        : 0x1b000000, // 452984832
  TOKEN_ASSEMBLY         : 0x20000000, // 536870912
  TOKEN_ASSEMBLY_REF     : 0x23000000, // 587202560
  TOKEN_FILE             : 0x26000000, // 637534208
  TOKEN_EXPORTED_TYPE    : 0x27000000, // 654311424
  TOKEN_MANIFEST_RESOURCE: 0x28000000, // 671088640
  TOKEN_GENERIC_PARAM    : 0x2a000000, // 704643072
  TOKEN_METHOD_SPEC      : 0x2b000000, // 721420288
  TOKEN_STRING           : 0x70000000, // 1879048192
  TOKEN_NAME             : 0x71000000, // 1895825408
  TOKEN_BASE_TYPE        : 0x72000000, // 1912602624
// class-internals.h
  APPDOMAIN_CREATED                    : 0x0, // 0
  APPDOMAIN_UNLOADING_START            : 0x1, // 1
  APPDOMAIN_UNLOADING                  : 0x2, // 2
  APPDOMAIN_UNLOADED                   : 0x3, // 3
  BITSET_DONT_FREE                     : 0x1, // 1
  CLASS_PROP_EXCEPTION_DATA            : 0x0, // 0
  DECLSEC_ACTION_MIN                   : 0x1, // 1
  DECLSEC_FLAG_REQUEST                 : 0x1, // 1
  DECLSEC_FLAG_DEMAND                  : 0x2, // 2
  DECLSEC_FLAG_ASSERT                  : 0x4, // 4
  DECLSEC_FLAG_DENY                    : 0x8, // 8
  DECLSEC_FLAG_PERMITONLY              : 0x10, // 16
  DECLSEC_ACTION_MAX                   : 0x12, // 18
  DECLSEC_FLAG_LINKDEMAND              : 0x20, // 32
  DECLSEC_FLAG_INHERITANCEDEMAND       : 0x40, // 64
  DECLSEC_FLAG_REQUEST_MINIMUM         : 0x80, // 128
  DECLSEC_FLAG_REQUEST_OPTIONAL        : 0x100, // 256
  DECLSEC_FLAG_REQUEST_REFUSE          : 0x200, // 512
  DECLSEC_FLAG_PREJIT_GRANT            : 0x400, // 1024
  DECLSEC_FLAG_PREJIT_DENY             : 0x800, // 2048
  DECLSEC_FLAG_NONCAS_DEMAND           : 0x1000, // 4096
  DECLSEC_FLAG_NONCAS_LINKDEMAND       : 0x2000, // 8192
  DECLSEC_FLAG_NONCAS_INHERITANCEDEMAND: 0x4000, // 16384
  DECLSEC_FLAG_LINKDEMAND_CHOICE       : 0x8000, // 32768
  DECLSEC_FLAG_INHERITANCEDEMAND_CHOICE: 0x10000, // 65536
  DECLSEC_FLAG_DEMAND_CHOICE           : 0x20000, // 131072
  DEFAULT_SUPERTABLE_SIZE              : 0x6, // 6
  DEPRECATED                           : 0x1, // 1
  DL_LAZY                              : 0x1, // 1
  DL_LOCAL                             : 0x2, // 2
  DL_MASK                              : 0x3, // 3
  ERROR_NONE                           : 0x0, // 0
  ERROR_FREE_STRINGS                   : 0x1, // 1
  ERROR_MISSING_METHOD                 : 0x1, // 1
  ERROR_INCOMPLETE                     : 0x2, // 2
  ERROR_MISSING_FIELD                  : 0x2, // 2
  ERROR_TYPE_LOAD                      : 0x3, // 3
  ERROR_FILE_NOT_FOUND                 : 0x4, // 4
  ERROR_BAD_IMAGE                      : 0x5, // 5
  ERROR_OUT_OF_MEMORY                  : 0x6, // 6
  ERROR_ARGUMENT                       : 0x7, // 7
  ERROR_NOT_VERIFIABLE                 : 0x8, // 8
  ERROR_GENERIC                        : 0x9, // 9
  EXCEPTION_NONE                       : 0x0, // 0
  EXCEPTION_SECURITY_LINKDEMAND        : 0x1, // 1
  EXCEPTION_SECURITY_INHERITANCEDEMAND : 0x2, // 2
  EXCEPTION_INVALID_PROGRAM            : 0x3, // 3
  EXCEPTION_UNVERIFIABLE_IL            : 0x4, // 4
  EXCEPTION_MISSING_METHOD             : 0x5, // 5
  EXCEPTION_MISSING_FIELD              : 0x6, // 6
  EXCEPTION_TYPE_LOAD                  : 0x7, // 7
  EXCEPTION_FILE_NOT_FOUND             : 0x8, // 8
  EXCEPTION_METHOD_ACCESS              : 0x9, // 9
  EXCEPTION_FIELD_ACCESS               : 0xa, // 10
  EXCEPTION_GENERIC_SHARING_FAILED     : 0xb, // 11
  EXCEPTION_BAD_IMAGE                  : 0xc, // 12
  EXCEPTION_OBJECT_SUPPLIED            : 0xd, // 13
  EXCEPTION_OUT_OF_MEMORY              : 0xe, // 14
  GENERIC_SHARING_NONE                 : 0x0, // 0
  GENERIC_CONTEXT_USED_CLASS           : 0x1, // 1
  GENERIC_SHARING_COLLECTIONS          : 0x1, // 1
  GENERIC_CONTEXT_USED_METHOD          : 0x2, // 2
  GENERIC_SHARING_CORLIB               : 0x2, // 2
  GENERIC_CONTEXT_USED_BOTH            : 0x3, // 3
  GENERIC_SHARING_ALL                  : 0x3, // 3
  HASH_CONSERVATIVE_GC                 : 0x0, // 0
  HASH_KEY_GC                          : 0x1, // 1
  HASH_VALUE_GC                        : 0x2, // 2
  HASH_KEY_VALUE_GC                    : 0x3, // 3
  INTERNAL                             : 0x1, // 1
  JIT_INFO_TABLE_CHUNK_SIZE            : 0x40, // 64
  LLVM_INTERNAL                        : 0x1, // 1
  METHOD_PROP_GENERIC_CONTAINER        : 0x0, // 0
  PROCESSOR_ARCHITECTURE_NONE          : 0x0, // 0
  PROCESSOR_ARCHITECTURE_MSIL          : 0x1, // 1
  PROCESSOR_ARCHITECTURE_X86           : 0x2, // 2
  PROCESSOR_ARCHITECTURE_IA64          : 0x3, // 3
  PROCESSOR_ARCHITECTURE_AMD64         : 0x4, // 4
  PROP_DYNAMIC_CATTR                   : 0x1000, // 4096
  PUBLIC_KEY_TOKEN_LENGTH              : 0x11, // 17
  REMOTING_TARGET_UNKNOWN              : 0x0, // 0
  REMOTING_TARGET_APPDOMAIN            : 0x1, // 1
  REMOTING_TARGET_COMINTEROP           : 0x2, // 2
  SECTION_TEXT                         : 0x0, // 0
  SECTION_RSRC                         : 0x1, // 1
  SECTION_RELOC                        : 0x2, // 2
  SECTION_MAX                          : 0x3, // 3
  TYPE_NAME_FORMAT_IL                  : 0x0, // 0
  TYPE_NAME_FORMAT_REFLECTION          : 0x1, // 1
  TYPE_NAME_FORMAT_FULL_NAME           : 0x2, // 2
  TYPE_NAME_FORMAT_ASSEMBLY_QUALIFIED  : 0x3, // 3
// tabledefs.h
  ASSEMBLY_HASH_NONE                            : 0x0, // 0
  ASSEMBLY_HASH_MD5                             : 0x8003, // 32771
  ASSEMBLY_HASH_SHA1                            : 0x8004, // 32772
  ASSEMBLYREF_FULL_PUBLIC_KEY_FLAG              : 0x1, // 1
  ASSEMBLYREF_RETARGETABLE_FLAG                 : 0x100, // 256
  ASSEMBLYREF_DISABLEJITCOMPILE_OPTIMIZER_FLAG  : 0x4000, // 16384
  ASSEMBLYREF_ENABLEJITCOMPILE_TRACKING_FLAG    : 0x8000, // 32768
  EVENT_SPECIALNAME                             : 0x200, // 512
  EVENT_RTSPECIALNAME                           : 0x400, // 1024
  FIELD_ATTRIBUTE_COMPILER_CONTROLLED           : 0x0, // 0
  FIELD_ATTRIBUTE_PRIVATE                       : 0x1, // 1
  FIELD_ATTRIBUTE_FAM_AND_ASSEM                 : 0x2, // 2
  FIELD_ATTRIBUTE_ASSEMBLY                      : 0x3, // 3
  FIELD_ATTRIBUTE_FAMILY                        : 0x4, // 4
  FIELD_ATTRIBUTE_FAM_OR_ASSEM                  : 0x5, // 5
  FIELD_ATTRIBUTE_PUBLIC                        : 0x6, // 6
  FIELD_ATTRIBUTE_FIELD_ACCESS_MASK             : 0x7, // 7
  FIELD_ATTRIBUTE_STATIC                        : 0x10, // 16
  FIELD_ATTRIBUTE_INIT_ONLY                     : 0x20, // 32
  FIELD_ATTRIBUTE_LITERAL                       : 0x40, // 64
  FIELD_ATTRIBUTE_NOT_SERIALIZED                : 0x80, // 128
  FIELD_ATTRIBUTE_HAS_FIELD_RVA                 : 0x100, // 256
  FIELD_ATTRIBUTE_SPECIAL_NAME                  : 0x200, // 512
  FIELD_ATTRIBUTE_RT_SPECIAL_NAME               : 0x400, // 1024
  FIELD_ATTRIBUTE_HAS_FIELD_MARSHAL             : 0x1000, // 4096
  FIELD_ATTRIBUTE_PINVOKE_IMPL                  : 0x2000, // 8192
  FIELD_ATTRIBUTE_HAS_DEFAULT                   : 0x8000, // 32768
  FIELD_ATTRIBUTE_RESERVED_MASK                 : 0x9500, // 38144
  FILE_CONTAINS_METADATA                        : 0x0, // 0
  FILE_CONTAINS_NO_METADATA                     : 0x1, // 1
  MANIFEST_RESOURCE_PUBLIC                      : 0x1, // 1
  MANIFEST_RESOURCE_PRIVATE                     : 0x2, // 2
  MANIFEST_RESOURCE_VISIBILITY_MASK             : 0x7, // 7
  METHOD_ATTRIBUTE_COMPILER_CONTROLLED          : 0x0, // 0
  METHOD_ATTRIBUTE_REUSE_SLOT                   : 0x0, // 0
  METHOD_IMPL_ATTRIBUTE_IL                      : 0x0, // 0
  METHOD_IMPL_ATTRIBUTE_MANAGED                 : 0x0, // 0
  METHOD_ATTRIBUTE_PRIVATE                      : 0x1, // 1
  METHOD_IMPL_ATTRIBUTE_NATIVE                  : 0x1, // 1
  METHOD_SEMANTIC_SETTER                        : 0x1, // 1
  METHOD_ATTRIBUTE_FAM_AND_ASSEM                : 0x2, // 2
  METHOD_IMPL_ATTRIBUTE_OPTIL                   : 0x2, // 2
  METHOD_SEMANTIC_GETTER                        : 0x2, // 2
  METHOD_ATTRIBUTE_ASSEM                        : 0x3, // 3
  METHOD_IMPL_ATTRIBUTE_CODE_TYPE_MASK          : 0x3, // 3
  METHOD_IMPL_ATTRIBUTE_RUNTIME                 : 0x3, // 3
  METHOD_ATTRIBUTE_FAMILY                       : 0x4, // 4
  METHOD_IMPL_ATTRIBUTE_MANAGED_MASK            : 0x4, // 4
  METHOD_IMPL_ATTRIBUTE_UNMANAGED               : 0x4, // 4
  METHOD_SEMANTIC_OTHER                         : 0x4, // 4
  METHOD_ATTRIBUTE_FAM_OR_ASSEM                 : 0x5, // 5
  METHOD_ATTRIBUTE_PUBLIC                       : 0x6, // 6
  METHOD_ATTRIBUTE_MEMBER_ACCESS_MASK           : 0x7, // 7
  METHOD_ATTRIBUTE_UNMANAGED_EXPORT             : 0x8, // 8
  METHOD_IMPL_ATTRIBUTE_NOINLINING              : 0x8, // 8
  METHOD_SEMANTIC_ADD_ON                        : 0x8, // 8
  METHOD_ATTRIBUTE_STATIC                       : 0x10, // 16
  METHOD_IMPL_ATTRIBUTE_FORWARD_REF             : 0x10, // 16
  METHOD_SEMANTIC_REMOVE_ON                     : 0x10, // 16
  METHOD_ATTRIBUTE_FINAL                        : 0x20, // 32
  METHOD_IMPL_ATTRIBUTE_SYNCHRONIZED            : 0x20, // 32
  METHOD_SEMANTIC_FIRE                          : 0x20, // 32
  METHOD_ATTRIBUTE_VIRTUAL                      : 0x40, // 64
  METHOD_IMPL_ATTRIBUTE_NOOPTIMIZATION          : 0x40, // 64
  METHOD_ATTRIBUTE_HIDE_BY_SIG                  : 0x80, // 128
  METHOD_IMPL_ATTRIBUTE_PRESERVE_SIG            : 0x80, // 128
  METHOD_ATTRIBUTE_NEW_SLOT                     : 0x100, // 256
  METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK           : 0x100, // 256
  METHOD_IMPL_ATTRIBUTE_AGGRESSIVE_INLINING     : 0x100, // 256
  METHOD_ATTRIBUTE_STRICT                       : 0x200, // 512
  METHOD_ATTRIBUTE_ABSTRACT                     : 0x400, // 1024
  METHOD_ATTRIBUTE_SPECIAL_NAME                 : 0x800, // 2048
  METHOD_ATTRIBUTE_RT_SPECIAL_NAME              : 0x1000, // 4096
  METHOD_IMPL_ATTRIBUTE_INTERNAL_CALL           : 0x1000, // 4096
  METHOD_ATTRIBUTE_PINVOKE_IMPL                 : 0x2000, // 8192
  METHOD_ATTRIBUTE_HAS_SECURITY                 : 0x4000, // 16384
  METHOD_ATTRIBUTE_REQUIRE_SEC_OBJECT           : 0x8000, // 32768
  METHOD_ATTRIBUTE_RESERVED_MASK                : 0xd000, // 53248
  METHOD_IMPL_ATTRIBUTE_MAX_METHOD_IMPL_VAL     : 0xffff, // 65535
  PARAM_ATTRIBUTE_IN                            : 0x1, // 1
  PARAM_ATTRIBUTE_OUT                           : 0x2, // 2
  PARAM_ATTRIBUTE_OPTIONAL                      : 0x10, // 16
  PARAM_ATTRIBUTE_HAS_DEFAULT                   : 0x1000, // 4096
  PARAM_ATTRIBUTE_HAS_FIELD_MARSHAL             : 0x2000, // 8192
  PARAM_ATTRIBUTE_UNUSED                        : 0xcfe0, // 53216
  PARAM_ATTRIBUTE_RESERVED_MASK                 : 0xf000, // 61440
  PINVOKE_ATTRIBUTE_CHAR_SET_NOT_SPEC           : 0x0, // 0
  PINVOKE_ATTRIBUTE_NO_MANGLE                   : 0x1, // 1
  PINVOKE_ATTRIBUTE_CHAR_SET_ANSI               : 0x2, // 2
  PINVOKE_ATTRIBUTE_CHAR_SET_UNICODE            : 0x4, // 4
  PINVOKE_ATTRIBUTE_CHAR_SET_AUTO               : 0x6, // 6
  PINVOKE_ATTRIBUTE_CHAR_SET_MASK               : 0x6, // 6
  PINVOKE_ATTRIBUTE_CALL_CONV_GENERICINST       : 0xa, // 10
  PINVOKE_ATTRIBUTE_BEST_FIT_ENABLED            : 0x10, // 16
  PINVOKE_ATTRIBUTE_CALL_CONV_GENERIC           : 0x10, // 16
  PINVOKE_ATTRIBUTE_BEST_FIT_DISABLED           : 0x20, // 32
  PINVOKE_ATTRIBUTE_BEST_FIT_MASK               : 0x30, // 48
  PINVOKE_ATTRIBUTE_SUPPORTS_LAST_ERROR         : 0x40, // 64
  PINVOKE_ATTRIBUTE_CALL_CONV_WINAPI            : 0x100, // 256
  PINVOKE_ATTRIBUTE_CALL_CONV_CDECL             : 0x200, // 512
  PINVOKE_ATTRIBUTE_CALL_CONV_STDCALL           : 0x300, // 768
  PINVOKE_ATTRIBUTE_CALL_CONV_THISCALL          : 0x400, // 1024
  PINVOKE_ATTRIBUTE_CALL_CONV_FASTCALL          : 0x500, // 1280
  PINVOKE_ATTRIBUTE_CALL_CONV_MASK              : 0x700, // 1792
  PINVOKE_ATTRIBUTE_THROW_ON_UNMAPPABLE_ENABLED : 0x1000, // 4096
  PINVOKE_ATTRIBUTE_THROW_ON_UNMAPPABLE_DISABLED: 0x2000, // 8192
  PINVOKE_ATTRIBUTE_THROW_ON_UNMAPPABLE_MASK    : 0x3000, // 12288
  PROPERTY_ATTRIBUTE_SPECIAL_NAME               : 0x200, // 512
  PROPERTY_ATTRIBUTE_RT_SPECIAL_NAME            : 0x400, // 1024
  PROPERTY_ATTRIBUTE_HAS_DEFAULT                : 0x1000, // 4096
  PROPERTY_ATTRIBUTE_UNUSED                     : 0xe9ff, // 59903
  PROPERTY_ATTRIBUTE_RESERVED_MASK              : 0xf400, // 62464
  SECURITY_ACTION_DEMAND                        : 0x2, // 2
  SECURITY_ACTION_ASSERT                        : 0x3, // 3
  SECURITY_ACTION_DENY                          : 0x4, // 4
  SECURITY_ACTION_PERMITONLY                    : 0x5, // 5
  SECURITY_ACTION_LINKDEMAND                    : 0x6, // 6
  SECURITY_ACTION_INHERITDEMAND                 : 0x7, // 7
  SECURITY_ACTION_REQMIN                        : 0x8, // 8
  SECURITY_ACTION_REQOPT                        : 0x9, // 9
  SECURITY_ACTION_REQREFUSE                     : 0xa, // 10
  SECURITY_ACTION_NONCASDEMAND                  : 0xd, // 13
  SECURITY_ACTION_NONCASLINKDEMAND              : 0xe, // 14
  SECURITY_ACTION_NONCASINHERITANCE             : 0xf, // 15
  SECURITY_ACTION_LINKDEMANDCHOICE              : 0x10, // 16
  SECURITY_ACTION_INHERITDEMANDCHOICE           : 0x11, // 17
  SECURITY_ACTION_DEMANDCHOICE                  : 0x12, // 18
  TYPE_ATTRIBUTE_ANSI_CLASS                     : 0x0, // 0
  TYPE_ATTRIBUTE_AUTO_LAYOUT                    : 0x0, // 0
  TYPE_ATTRIBUTE_CLASS                          : 0x0, // 0
  TYPE_ATTRIBUTE_NOT_PUBLIC                     : 0x0, // 0
  TYPE_ATTRIBUTE_PUBLIC                         : 0x1, // 1
  TYPE_ATTRIBUTE_NESTED_PUBLIC                  : 0x2, // 2
  TYPE_ATTRIBUTE_NESTED_PRIVATE                 : 0x3, // 3
  TYPE_ATTRIBUTE_NESTED_FAMILY                  : 0x4, // 4
  TYPE_ATTRIBUTE_NESTED_ASSEMBLY                : 0x5, // 5
  TYPE_ATTRIBUTE_NESTED_FAM_AND_ASSEM           : 0x6, // 6
  TYPE_ATTRIBUTE_NESTED_FAM_OR_ASSEM            : 0x7, // 7
  TYPE_ATTRIBUTE_VISIBILITY_MASK                : 0x7, // 7
  TYPE_ATTRIBUTE_SEQUENTIAL_LAYOUT              : 0x8, // 8
  TYPE_ATTRIBUTE_EXPLICIT_LAYOUT                : 0x10, // 16
  TYPE_ATTRIBUTE_LAYOUT_MASK                    : 0x18, // 24
  TYPE_ATTRIBUTE_CLASS_SEMANTIC_MASK            : 0x20, // 32
  TYPE_ATTRIBUTE_INTERFACE                      : 0x20, // 32
  TYPE_ATTRIBUTE_ABSTRACT                       : 0x80, // 128
  TYPE_ATTRIBUTE_SEALED                         : 0x100, // 256
  TYPE_ATTRIBUTE_SPECIAL_NAME                   : 0x400, // 1024
  TYPE_ATTRIBUTE_RT_SPECIAL_NAME                : 0x800, // 2048
  TYPE_ATTRIBUTE_IMPORT                         : 0x1000, // 4096
  TYPE_ATTRIBUTE_SERIALIZABLE                   : 0x2000, // 8192
  TYPE_ATTRIBUTE_UNICODE_CLASS                  : 0x10000, // 65536
  TYPE_ATTRIBUTE_AUTO_CLASS                     : 0x20000, // 131072
  TYPE_ATTRIBUTE_STRING_FORMAT_MASK             : 0x30000, // 196608
  TYPE_ATTRIBUTE_HAS_SECURITY                   : 0x40000, // 262144
  TYPE_ATTRIBUTE_RESERVED_MASK                  : 0x40800, // 264192
  TYPE_ATTRIBUTE_BEFORE_FIELD_INIT              : 0x100000, // 1048576
  TYPE_ATTRIBUTE_FORWARDER                      : 0x200000, // 2097152
// cil-coff.h
  CLI_FLAGS_ILONLY                            : 0x1, // 1
  CLI_FLAGS_32BITREQUIRED                     : 0x2, // 2
  CLI_FLAGS_STRONGNAMESIGNED                  : 0x8, // 8
  CLI_FLAGS_TRACKDEBUGDATA                    : 0x10000, // 65536
  COFF_ATTRIBUTE_EXECUTABLE_IMAGE             : 0x2, // 2
  COFF_ATTRIBUTE_LIBRARY_IMAGE                : 0x2000, // 8192
  METHOD_HEADER_SECTION_RESERVED              : 0x0, // 0
  METHOD_HEADER_SECTION_EHTABLE               : 0x1, // 1
  METHOD_HEADER_SECTION_OPTIL_TABLE           : 0x2, // 2
  METHOD_HEADER_TINY_FORMAT                   : 0x2, // 2
  METHOD_HEADER_FAT_FORMAT                    : 0x3, // 3
  METHOD_HEADER_FORMAT_MASK                   : 0x3, // 3
  METHOD_HEADER_MORE_SECTS                    : 0x8, // 8
  METHOD_HEADER_INIT_LOCALS                   : 0x10, // 16
  METHOD_HEADER_SECTION_FAT_FORMAT            : 0x40, // 64
  METHOD_HEADER_SECTION_MORE_SECTS            : 0x80, // 128
  PE_RESOURCE_ID_CURSOR                       : 0x1, // 1
  PE_RESOURCE_ID_BITMAP                       : 0x2, // 2
  PE_RESOURCE_ID_ICON                         : 0x3, // 3
  PE_RESOURCE_ID_MENU                         : 0x4, // 4
  PE_RESOURCE_ID_DIALOG                       : 0x5, // 5
  PE_RESOURCE_ID_STRING                       : 0x6, // 6
  PE_RESOURCE_ID_FONTDIR                      : 0x7, // 7
  PE_RESOURCE_ID_FONT                         : 0x8, // 8
  PE_RESOURCE_ID_ACCEL                        : 0x9, // 9
  PE_RESOURCE_ID_RCDATA                       : 0xa, // 10
  PE_RESOURCE_ID_MESSAGETABLE                 : 0xb, // 11
  PE_RESOURCE_ID_GROUP_CURSOR                 : 0xc, // 12
  PE_RESOURCE_ID_GROUP_ICON                   : 0xd, // 13
  PE_RESOURCE_ID_VERSION                      : 0x10, // 16
  PE_RESOURCE_ID_DLGINCLUDE                   : 0x11, // 17
  PE_RESOURCE_ID_PLUGPLAY                     : 0x13, // 19
  PE_RESOURCE_ID_VXD                          : 0x14, // 20
  PE_RESOURCE_ID_ANICURSOR                    : 0x15, // 21
  PE_RESOURCE_ID_ANIICON                      : 0x16, // 22
  PE_RESOURCE_ID_HTML                         : 0x17, // 23
  PE_RESOURCE_ID_ASPNET_STRING                : 0x65, // 101
  SECT_FLAGS_HAS_CODE                         : 0x20, // 32
  SECT_FLAGS_HAS_INITIALIZED_DATA             : 0x40, // 64
  SECT_FLAGS_HAS_UNINITIALIZED_DATA           : 0x80, // 128
  SECT_FLAGS_MEM_DISCARDABLE                  : 0x2000000, // 33554432
  SECT_FLAGS_MEM_NOT_CACHED                   : 0x4000000, // 67108864
  SECT_FLAGS_MEM_NOT_PAGED                    : 0x8000000, // 134217728
  SECT_FLAGS_MEM_SHARED                       : 0x10000000, // 268435456
  SECT_FLAGS_MEM_EXECUTE                      : 0x20000000, // 536870912
  SECT_FLAGS_MEM_READ                         : 0x40000000, // 1073741824
  SECT_FLAGS_MEM_WRITE                        : 0x80000000, // 2147483648
  VTFIXUP_TYPE_32BIT                          : 0x1, // 1
  VTFIXUP_TYPE_64BIT                          : 0x2, // 2
  VTFIXUP_TYPE_FROM_UNMANAGED                 : 0x4, // 4
  VTFIXUP_TYPE_FROM_UNMANAGED_RETAIN_APPDOMAIN: 0x8, // 8
  VTFIXUP_TYPE_CALL_MOST_DERIVED              : 0x10, // 16
// wrapper_types.h
  WRAPPER_NONE                      : 0x0, // 0
  WRAPPER_DELEGATE_INVOKE           : 0x1, // 1
  WRAPPER_DELEGATE_BEGIN_INVOKE     : 0x2, // 2
  WRAPPER_DELEGATE_END_INVOKE       : 0x3, // 3
  WRAPPER_RUNTIME_INVOKE            : 0x4, // 4
  WRAPPER_NATIVE_TO_MANAGED         : 0x5, // 5
  WRAPPER_MANAGED_TO_NATIVE         : 0x6, // 6
  WRAPPER_MANAGED_TO_MANAGED        : 0x7, // 7
  WRAPPER_REMOTING_INVOKE           : 0x8, // 8
  WRAPPER_REMOTING_INVOKE_WITH_CHECK: 0x9, // 9
  WRAPPER_XDOMAIN_INVOKE            : 0xa, // 10
  WRAPPER_XDOMAIN_DISPATCH          : 0xb, // 11
  WRAPPER_LDFLD                     : 0xc, // 12
  WRAPPER_STFLD                     : 0xd, // 13
  WRAPPER_LDFLD_REMOTE              : 0xe, // 14
  WRAPPER_STFLD_REMOTE              : 0xf, // 15
  WRAPPER_SYNCHRONIZED              : 0x10, // 16
  WRAPPER_DYNAMIC_METHOD            : 0x11, // 17
  WRAPPER_ISINST                    : 0x12, // 18
  WRAPPER_CASTCLASS                 : 0x13, // 19
  WRAPPER_PROXY_ISINST              : 0x14, // 20
  WRAPPER_STELEMREF                 : 0x15, // 21
  WRAPPER_UNBOX                     : 0x16, // 22
  WRAPPER_LDFLDA                    : 0x17, // 23
  WRAPPER_WRITE_BARRIER             : 0x18, // 24
  WRAPPER_UNKNOWN                   : 0x19, // 25
  WRAPPER_COMINTEROP_INVOKE         : 0x1a, // 26
  WRAPPER_COMINTEROP                : 0x1b, // 27
  WRAPPER_ALLOC                     : 0x1c, // 28
// opcodes.h
  CEE_ARGLIST            : 0x0, // 0
  CEE_ENDMAC             : 0x0, // 0
  CEE_ILLEGAL            : 0x0, // 0
  CEE_MONO_ICALL         : 0x0, // 0
  CEE_NOP                : 0x0, // 0
  CEE_BREAK              : 0x1, // 1
  CEE_CEQ                : 0x1, // 1
  CEE_MONO_OBJADDR       : 0x1, // 1
  CEE_CGT                : 0x2, // 2
  CEE_LDARG_0            : 0x2, // 2
  CEE_MONO_LDPTR         : 0x2, // 2
  CEE_CGT_UN             : 0x3, // 3
  CEE_LDARG_1            : 0x3, // 3
  CEE_MONO_VTADDR        : 0x3, // 3
  CEE_CLT                : 0x4, // 4
  CEE_LDARG_2            : 0x4, // 4
  CEE_MONO_NEWOBJ        : 0x4, // 4
  CEE_CLT_UN             : 0x5, // 5
  CEE_LDARG_3            : 0x5, // 5
  CEE_MONO_RETOBJ        : 0x5, // 5
  CEE_LDFTN              : 0x6, // 6
  CEE_LDLOC_0            : 0x6, // 6
  CEE_MONO_LDNATIVEOBJ   : 0x6, // 6
  CEE_LDLOC_1            : 0x7, // 7
  CEE_LDVIRTFTN          : 0x7, // 7
  CEE_MONO_CISINST       : 0x7, // 7
  CEE_LDLOC_2            : 0x8, // 8
  CEE_MONO_CCASTCLASS    : 0x8, // 8
  CEE_UNUSED56           : 0x8, // 8
  CEE_LDARG              : 0x9, // 9
  CEE_LDLOC_3            : 0x9, // 9
  CEE_MONO_SAVE_LMF      : 0x9, // 9
  CEE_LDARGA             : 0xa, // 10
  CEE_MONO_RESTORE_LMF   : 0xa, // 10
  CEE_STLOC_0            : 0xa, // 10
  CEE_MONO_CLASSCONST    : 0xb, // 11
  CEE_STARG              : 0xb, // 11
  CEE_STLOC_1            : 0xb, // 11
  CEE_LDLOC              : 0xc, // 12
  CEE_MONO_NOT_TAKEN     : 0xc, // 12
  CEE_STLOC_2            : 0xc, // 12
  CEE_LDLOCA             : 0xd, // 13
  CEE_MONO_TLS           : 0xd, // 13
  CEE_STLOC_3            : 0xd, // 13
  CEE_LDARG_S            : 0xe, // 14
  CEE_MONO_ICALL_ADDR    : 0xe, // 14
  CEE_STLOC              : 0xe, // 14
  CEE_LDARGA_S           : 0xf, // 15
  CEE_LOCALLOC           : 0xf, // 15
  CEE_MONO_DYN_CALL      : 0xf, // 15
  CEE_MONO_MEMORY_BARRIER: 0x10, // 16
  CEE_STARG_S            : 0x10, // 16
  CEE_UNUSED57           : 0x10, // 16
  CEE_ENDFILTER          : 0x11, // 17
  CEE_LDLOC_S            : 0x11, // 17
  CEE_LDLOCA_S           : 0x12, // 18
  CEE_UNALIGNED_         : 0x12, // 18
  CEE_STLOC_S            : 0x13, // 19
  CEE_VOLATILE_          : 0x13, // 19
  CEE_LDNULL             : 0x14, // 20
  CEE_TAIL_              : 0x14, // 20
  CEE_INITOBJ            : 0x15, // 21
  CEE_LDC_I4_M1          : 0x15, // 21
  CEE_CONSTRAINED_       : 0x16, // 22
  CEE_LDC_I4_0           : 0x16, // 22
  CEE_CPBLK              : 0x17, // 23
  CEE_LDC_I4_1           : 0x17, // 23
  CEE_INITBLK            : 0x18, // 24
  CEE_LDC_I4_2           : 0x18, // 24
  CEE_LDC_I4_3           : 0x19, // 25
  CEE_NO_                : 0x19, // 25
  CEE_LDC_I4_4           : 0x1a, // 26
  CEE_RETHROW            : 0x1a, // 26
  CEE_LDC_I4_5           : 0x1b, // 27
  CEE_UNUSED             : 0x1b, // 27
  CEE_LDC_I4_6           : 0x1c, // 28
  CEE_SIZEOF             : 0x1c, // 28
  CEE_LDC_I4_7           : 0x1d, // 29
  CEE_REFANYTYPE         : 0x1d, // 29
  CEE_LDC_I4_8           : 0x1e, // 30
  CEE_READONLY_          : 0x1e, // 30
  CEE_LDC_I4_S           : 0x1f, // 31
  CEE_UNUSED53           : 0x1f, // 31
  CEE_LDC_I4             : 0x20, // 32
  CEE_UNUSED54           : 0x20, // 32
  CEE_LDC_I8             : 0x21, // 33
  CEE_UNUSED55           : 0x21, // 33
  CEE_LDC_R4             : 0x22, // 34
  CEE_UNUSED70           : 0x22, // 34
  CEE_LDC_R8             : 0x23, // 35
  CEE_UNUSED99           : 0x24, // 36
  CEE_DUP                : 0x25, // 37
  CEE_POP                : 0x26, // 38
  CEE_JMP                : 0x27, // 39
  CEE_CALL               : 0x28, // 40
  CEE_CALLI              : 0x29, // 41
  CEE_RET                : 0x2a, // 42
  CEE_BR_S               : 0x2b, // 43
  CEE_BRFALSE_S          : 0x2c, // 44
  CEE_BRTRUE_S           : 0x2d, // 45
  CEE_BEQ_S              : 0x2e, // 46
  CEE_BGE_S              : 0x2f, // 47
  CEE_BGT_S              : 0x30, // 48
  CEE_BLE_S              : 0x31, // 49
  CEE_BLT_S              : 0x32, // 50
  CEE_BNE_UN_S           : 0x33, // 51
  CEE_BGE_UN_S           : 0x34, // 52
  CEE_BGT_UN_S           : 0x35, // 53
  CEE_BLE_UN_S           : 0x36, // 54
  CEE_BLT_UN_S           : 0x37, // 55
  CEE_BR                 : 0x38, // 56
  CEE_BRFALSE            : 0x39, // 57
  CEE_BRTRUE             : 0x3a, // 58
  CEE_BEQ                : 0x3b, // 59
  CEE_BGE                : 0x3c, // 60
  CEE_BGT                : 0x3d, // 61
  CEE_BLE                : 0x3e, // 62
  CEE_BLT                : 0x3f, // 63
  CEE_BNE_UN             : 0x40, // 64
  CEE_BGE_UN             : 0x41, // 65
  CEE_BGT_UN             : 0x42, // 66
  CEE_BLE_UN             : 0x43, // 67
  CEE_BLT_UN             : 0x44, // 68
  CEE_SWITCH             : 0x45, // 69
  CEE_LDIND_I1           : 0x46, // 70
  CEE_LDIND_U1           : 0x47, // 71
  CEE_LDIND_I2           : 0x48, // 72
  CEE_LDIND_U2           : 0x49, // 73
  CEE_LDIND_I4           : 0x4a, // 74
  CEE_LDIND_U4           : 0x4b, // 75
  CEE_LDIND_I8           : 0x4c, // 76
  CEE_LDIND_I            : 0x4d, // 77
  CEE_LDIND_R4           : 0x4e, // 78
  CEE_LDIND_R8           : 0x4f, // 79
  CEE_LDIND_REF          : 0x50, // 80
  CEE_STIND_REF          : 0x51, // 81
  CEE_STIND_I1           : 0x52, // 82
  CEE_STIND_I2           : 0x53, // 83
  CEE_STIND_I4           : 0x54, // 84
  CEE_STIND_I8           : 0x55, // 85
  CEE_STIND_R4           : 0x56, // 86
  CEE_STIND_R8           : 0x57, // 87
  CEE_ADD                : 0x58, // 88
  CEE_SUB                : 0x59, // 89
  CEE_MUL                : 0x5a, // 90
  CEE_DIV                : 0x5b, // 91
  CEE_DIV_UN             : 0x5c, // 92
  CEE_REM                : 0x5d, // 93
  CEE_REM_UN             : 0x5e, // 94
  CEE_AND                : 0x5f, // 95
  CEE_OR                 : 0x60, // 96
  CEE_XOR                : 0x61, // 97
  CEE_SHL                : 0x62, // 98
  CEE_SHR                : 0x63, // 99
  CEE_SHR_UN             : 0x64, // 100
  CEE_NEG                : 0x65, // 101
  CEE_NOT                : 0x66, // 102
  CEE_CONV_I1            : 0x67, // 103
  CEE_CONV_I2            : 0x68, // 104
  CEE_CONV_I4            : 0x69, // 105
  CEE_CONV_I8            : 0x6a, // 106
  CEE_CONV_R4            : 0x6b, // 107
  CEE_CONV_R8            : 0x6c, // 108
  CEE_CONV_U4            : 0x6d, // 109
  CEE_CONV_U8            : 0x6e, // 110
  CEE_CALLVIRT           : 0x6f, // 111
  CEE_CPOBJ              : 0x70, // 112
  CEE_LDOBJ              : 0x71, // 113
  CEE_LDSTR              : 0x72, // 114
  CEE_NEWOBJ             : 0x73, // 115
  CEE_CASTCLASS          : 0x74, // 116
  CEE_ISINST             : 0x75, // 117
  CEE_CONV_R_UN          : 0x76, // 118
  CEE_UNUSED58           : 0x77, // 119
  CEE_UNUSED1            : 0x78, // 120
  CEE_UNBOX              : 0x79, // 121
  CEE_THROW              : 0x7a, // 122
  CEE_LDFLD              : 0x7b, // 123
  CEE_LDFLDA             : 0x7c, // 124
  CEE_STFLD              : 0x7d, // 125
  CEE_LDSFLD             : 0x7e, // 126
  CEE_LDSFLDA            : 0x7f, // 127
  CEE_STSFLD             : 0x80, // 128
  CEE_STOBJ              : 0x81, // 129
  CEE_CONV_OVF_I1_UN     : 0x82, // 130
  CEE_CONV_OVF_I2_UN     : 0x83, // 131
  CEE_CONV_OVF_I4_UN     : 0x84, // 132
  CEE_CONV_OVF_I8_UN     : 0x85, // 133
  CEE_CONV_OVF_U1_UN     : 0x86, // 134
  CEE_CONV_OVF_U2_UN     : 0x87, // 135
  CEE_CONV_OVF_U4_UN     : 0x88, // 136
  CEE_CONV_OVF_U8_UN     : 0x89, // 137
  CEE_CONV_OVF_I_UN      : 0x8a, // 138
  CEE_CONV_OVF_U_UN      : 0x8b, // 139
  CEE_BOX                : 0x8c, // 140
  CEE_NEWARR             : 0x8d, // 141
  CEE_LDLEN              : 0x8e, // 142
  CEE_LDELEMA            : 0x8f, // 143
  CEE_LDELEM_I1          : 0x90, // 144
  CEE_LDELEM_U1          : 0x91, // 145
  CEE_LDELEM_I2          : 0x92, // 146
  CEE_LDELEM_U2          : 0x93, // 147
  CEE_LDELEM_I4          : 0x94, // 148
  CEE_LDELEM_U4          : 0x95, // 149
  CEE_LDELEM_I8          : 0x96, // 150
  CEE_LDELEM_I           : 0x97, // 151
  CEE_LDELEM_R4          : 0x98, // 152
  CEE_LDELEM_R8          : 0x99, // 153
  CEE_LDELEM_REF         : 0x9a, // 154
  CEE_STELEM_I           : 0x9b, // 155
  CEE_STELEM_I1          : 0x9c, // 156
  CEE_STELEM_I2          : 0x9d, // 157
  CEE_STELEM_I4          : 0x9e, // 158
  CEE_STELEM_I8          : 0x9f, // 159
  CEE_STELEM_R4          : 0xa0, // 160
  CEE_STELEM_R8          : 0xa1, // 161
  CEE_STELEM_REF         : 0xa2, // 162
  CEE_LDELEM             : 0xa3, // 163
  CEE_STELEM             : 0xa4, // 164
  CEE_UNBOX_ANY          : 0xa5, // 165
  CEE_UNUSED5            : 0xa6, // 166
  CEE_UNUSED6            : 0xa7, // 167
  CEE_UNUSED7            : 0xa8, // 168
  CEE_UNUSED8            : 0xa9, // 169
  CEE_UNUSED9            : 0xaa, // 170
  CEE_UNUSED10           : 0xab, // 171
  CEE_UNUSED11           : 0xac, // 172
  CEE_UNUSED12           : 0xad, // 173
  CEE_UNUSED13           : 0xae, // 174
  CEE_UNUSED14           : 0xaf, // 175
  CEE_UNUSED15           : 0xb0, // 176
  CEE_UNUSED16           : 0xb1, // 177
  CEE_UNUSED17           : 0xb2, // 178
  CEE_CONV_OVF_I1        : 0xb3, // 179
  CEE_CONV_OVF_U1        : 0xb4, // 180
  CEE_CONV_OVF_I2        : 0xb5, // 181
  CEE_CONV_OVF_U2        : 0xb6, // 182
  CEE_CONV_OVF_I4        : 0xb7, // 183
  CEE_CONV_OVF_U4        : 0xb8, // 184
  CEE_CONV_OVF_I8        : 0xb9, // 185
  CEE_CONV_OVF_U8        : 0xba, // 186
  CEE_UNUSED50           : 0xbb, // 187
  CEE_UNUSED18           : 0xbc, // 188
  CEE_UNUSED19           : 0xbd, // 189
  CEE_UNUSED20           : 0xbe, // 190
  CEE_UNUSED21           : 0xbf, // 191
  CEE_UNUSED22           : 0xc0, // 192
  CEE_UNUSED23           : 0xc1, // 193
  CEE_REFANYVAL          : 0xc2, // 194
  CEE_CKFINITE           : 0xc3, // 195
  CEE_UNUSED24           : 0xc4, // 196
  CEE_UNUSED25           : 0xc5, // 197
  CEE_MKREFANY           : 0xc6, // 198
  CEE_UNUSED59           : 0xc7, // 199
  CEE_UNUSED60           : 0xc8, // 200
  CEE_UNUSED61           : 0xc9, // 201
  CEE_UNUSED62           : 0xca, // 202
  CEE_UNUSED63           : 0xcb, // 203
  CEE_UNUSED64           : 0xcc, // 204
  CEE_UNUSED65           : 0xcd, // 205
  CEE_UNUSED66           : 0xce, // 206
  CEE_UNUSED67           : 0xcf, // 207
  CEE_LDTOKEN            : 0xd0, // 208
  CEE_CONV_U2            : 0xd1, // 209
  CEE_CONV_U1            : 0xd2, // 210
  CEE_CONV_I             : 0xd3, // 211
  CEE_CONV_OVF_I         : 0xd4, // 212
  CEE_CONV_OVF_U         : 0xd5, // 213
  CEE_ADD_OVF            : 0xd6, // 214
  CEE_ADD_OVF_UN         : 0xd7, // 215
  CEE_MUL_OVF            : 0xd8, // 216
  CEE_MUL_OVF_UN         : 0xd9, // 217
  CEE_SUB_OVF            : 0xda, // 218
  CEE_SUB_OVF_UN         : 0xdb, // 219
  CEE_ENDFINALLY         : 0xdc, // 220
  CEE_LEAVE              : 0xdd, // 221
  CEE_LEAVE_S            : 0xde, // 222
  CEE_STIND_I            : 0xdf, // 223
  CEE_CONV_U             : 0xe0, // 224
  CEE_UNUSED26           : 0xe1, // 225
  CEE_UNUSED27           : 0xe2, // 226
  CEE_UNUSED28           : 0xe3, // 227
  CEE_UNUSED29           : 0xe4, // 228
  CEE_UNUSED30           : 0xe5, // 229
  CEE_UNUSED31           : 0xe6, // 230
  CEE_UNUSED32           : 0xe7, // 231
  CEE_UNUSED33           : 0xe8, // 232
  CEE_UNUSED34           : 0xe9, // 233
  CEE_UNUSED35           : 0xea, // 234
  CEE_UNUSED36           : 0xeb, // 235
  CEE_UNUSED37           : 0xec, // 236
  CEE_UNUSED38           : 0xed, // 237
  CEE_UNUSED39           : 0xee, // 238
  CEE_UNUSED40           : 0xef, // 239
  CEE_UNUSED41           : 0xf0, // 240
  CEE_UNUSED42           : 0xf1, // 241
  CEE_UNUSED43           : 0xf2, // 242
  CEE_UNUSED44           : 0xf3, // 243
  CEE_UNUSED45           : 0xf4, // 244
  CEE_UNUSED46           : 0xf5, // 245
  CEE_UNUSED47           : 0xf6, // 246
  CEE_UNUSED48           : 0xf7, // 247
  CEE_PREFIX7            : 0xf8, // 248
  CEE_PREFIX6            : 0xf9, // 249
  CEE_PREFIX5            : 0xfa, // 250
  CEE_PREFIX4            : 0xfb, // 251
  CEE_PREFIX3            : 0xfc, // 252
  CEE_PREFIX2            : 0xfd, // 253
  CEE_PREFIX1            : 0xfe, // 254
  CEE_PREFIXREF          : 0xff, // 255
  CUSTOM_PREFIX          : 0xf0, // 240
  FLOW_NEXT              : 0x0, // 0
  FLOW_BRANCH            : 0x1, // 1
  FLOW_COND_BRANCH       : 0x2, // 2
  FLOW_ERROR             : 0x3, // 3
  FLOW_CALL              : 0x4, // 4
  FLOW_RETURN            : 0x5, // 5
  FLOW_META              : 0x6, // 6
  InlineBrTarget         : 0x9, // 9
  InlineField            : 0x2, // 2
  InlineI                : 0xe, // 14
  InlineI8               : 0x10, // 16
  InlineMethod           : 0x3, // 3
  InlineNone             : 0x0, // 0
  InlineR                : 0xc, // 12
  InlineSig              : 0x6, // 6
  InlineString           : 0x5, // 5
  InlineSwitch           : 0xb, // 11
  InlineTok              : 0x4, // 4
  InlineType             : 0x1, // 1
  InlineVar              : 0x7, // 7
  ShortInlineBrTarget    : 0xa, // 10
  ShortInlineI           : 0xf, // 15
  ShortInlineR           : 0xd, // 13
  ShortInlineVar         : 0x8, // 8
}; // end of constants

/** @enum {int} */
var MetaType = {
  UINT32    : 1,
  UINT16    : 2,
  UINT8     : 3,
  BLOB_IDX  : 4,
  STRING_IDX: 5,
  GUID_IDX  : 6,
  TABLE_IDX : 7,
  CONST_IDX : 8,
  HASCAT_IDX: 9,
  CAT_IDX   : 10,
  HASDEC_IDX: 11,
  IMPL_IDX  : 12,
  HFM_IDX   : 13,
  MF_IDX    : 14,
  TDOR_IDX  : 15,
  MRP_IDX   : 16,
  MDOR_IDX  : 17,
  HS_IDX    : 18,
  RS_IDX    : 19,
}; // end of enum MetaType

/** @const {Array} */
var TableSchema = [
  { // TABLE_MODULE
    name: "Module",
    fields: [
      "Generation",
      "Name",
      "MVID",
      "EncID",
      "EncBaseID",
    ],
    field_type: [
      MetaType.UINT16,
      MetaType.STRING_IDX,
      MetaType.GUID_IDX,
      MetaType.GUID_IDX,
      MetaType.GUID_IDX,
    ],
  },
  { // TABLE_TYPEREF
    name: "TypeRef",
    fields: [
      "ResolutionScope=ResolutionScope",
      "Name",
      "Namespace",
    ],
    field_type: [
      MetaType.RS_IDX,
      MetaType.STRING_IDX,
      MetaType.STRING_IDX,
    ],
  },
  { // TABLE_TYPEDEF
    name: "TypeDef",
    fields: [
      "Flags",
      "Name",
      "Namespace",
      "Extends",
      "FieldList:Field",
      "MethodList:Method",
    ],
    field_type: [
      MetaType.UINT32,
      MetaType.STRING_IDX,
      MetaType.STRING_IDX,
      MetaType.TDOR_IDX,
      MetaType.TABLE_IDX,
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_FIELD_POINTER
    name: "FieldPtr",
    fields: [
      "Field",
    ],
    field_type: [
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_FIELD
    name: "Field",
    fields: [
      "Flags",
      "Name",
      "Signature",
    ],
    field_type: [
      MetaType.UINT16,
      MetaType.STRING_IDX,
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_METHOD_POINTER
    name: "MethodPtr",
    fields: [
      "Method",
    ],
    field_type: [
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_METHOD
    name: "Method",
    fields: [
      "RVA",
      "ImplFlags#MethodImplAttributes",
      "Flags#MethodAttribute",
      "Name",
      "Signature",
      "ParamList:Param",
    ],
    field_type: [
      MetaType.UINT32,
      MetaType.UINT16,
      MetaType.UINT16,
      MetaType.STRING_IDX,
      MetaType.BLOB_IDX,
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_PARAM_POINTER
    name: "ParamPtr",
    fields: [
      "Param",
    ],
    field_type: [
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_PARAM
    name: "Param",
    fields: [
      "Flags",
      "Sequence",
      "Name",
    ],
    field_type: [
      MetaType.UINT16,
      MetaType.UINT16,
      MetaType.STRING_IDX,
    ],
  },
  { // TABLE_INTERFACEIMPL
    name: "InterfaceImpl",
    fields: [
      "Class:TypeDef",
      "Interface=TypeDefOrRef",
    ],
    field_type: [
      MetaType.TABLE_IDX,
      MetaType.TDOR_IDX,
    ],
  },
  { // TABLE_MEMBERREF
    name: "MemberRef",
    fields: [
      "Class",
      "Name",
      "Signature",
    ],
    field_type: [
      MetaType.MRP_IDX,
      MetaType.STRING_IDX,
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_CONSTANT
    name: "Constant",
    fields: [
      "Type",
      "PaddingZero",
      "Parent",
      "Value",
    ],
    field_type: [
      MetaType.UINT8,
      MetaType.UINT8,
      MetaType.CONST_IDX,
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_CUSTOMATTRIBUTE
    name: "CustomAttribute",
    fields: [
      "Parent",
      "Type",
      "Value",
    ],
    field_type: [
      MetaType.HASCAT_IDX,
      MetaType.CAT_IDX,
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_FIELDMARSHAL
    name: "FieldMarshal",
    fields: [
      "Parent",
      "NativeType",
    ],
    field_type: [
      MetaType.HFM_IDX,
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_DECLSECURITY
    name: "DeclSecurity",
    fields: [
      "Action",
      "Parent",
      "PermissionSet",
    ],
    field_type: [
      MetaType.UINT16,
      MetaType.HASDEC_IDX,
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_CLASSLAYOUT
    name: "ClassLayout",
    fields: [
      "PackingSize",
      "ClassSize",
      "Parent:TypeDef",
    ],
    field_type: [
      MetaType.UINT16,
      MetaType.UINT32,
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_FIELDLAYOUT
    name: "FieldLayoutt",
    fields: [
      "Offset",
      "Field:Field",
    ],
    field_type: [
      MetaType.UINT32,
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_STANDALONESIG
    name: "StandaloneSig",
    fields: [
      "Signature",
    ],
    field_type: [
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_EVENTMAP
    name: "EventMap",
    fields: [
      "Parent:TypeDef",
      "EventList:Event",
    ],
    field_type: [
      MetaType.TABLE_IDX,
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_EVENT_POINTER
    name: "EventPtr",
    fields: [
      "Event",
    ],
    field_type: [
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_EVENT
    name: "Event",
    fields: [
      "EventFlags#EventAttribute",
      "Name",
      "EventType",
    ],
    field_type: [
      MetaType.UINT16,
      MetaType.STRING_IDX,
      MetaType.TDOR_IDX,
    ],
  },
  { // TABLE_PROPERTYMAP
    name: "PropertyMap",
    fields: [
      "Parent:TypeDef",
      "PropertyList:Property",
    ],
    field_type: [
      MetaType.TABLE_IDX,
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_PROPERTY_POINTER
    name: "PropertyPtr",
    fields: [
      "Property",
    ],
    field_type: [
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_PROPERTY
    name: "Property",
    fields: [
      "Flags",
      "Name",
      "Type",
    ],
    field_type: [
      MetaType.UINT16,
      MetaType.STRING_IDX,
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_METHODSEMANTICS
    name: "MethodSemantics",
    fields: [
      "MethodSemantic",
      "Method:Method",
      "Association",
    ],
    field_type: [
      MetaType.UINT16,
      MetaType.TABLE_IDX,
      MetaType.HS_IDX,
    ],
  },
  { // TABLE_METHODIMPL
    name: "MethodImpl",
    fields: [
      "Class:TypeDef",
      "MethodBody",
      "MethodDeclaration",
    ],
    field_type: [
      MetaType.TABLE_IDX,
      MetaType.MDOR_IDX,
      MetaType.MDOR_IDX,
    ],
  },
  { // TABLE_MODULEREF
    name: "Moduleref",
    fields: [
      "Name",
    ],
    field_type: [
      MetaType.STRING_IDX,
    ],
  },
  { // TABLE_TYPESPEC
    name: "TypeSpec",
    fields: [
      "Signature",
    ],
    field_type: [
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_IMPLMAP
    name: "ImplMap",
    fields: [
      "MappingFlag",
      "MemberForwarded",
      "ImportName",
      "ImportScope:ModuleRef",
    ],
    field_type: [
      MetaType.UINT16,
      MetaType.MF_IDX,
      MetaType.STRING_IDX,
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_FIELDRVA
    name: "FieldRVA",
    fields: [
      "RVA",
      "Field:Field",
    ],
    field_type: [
      MetaType.UINT32,
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_UNUSED6
    name: "",
    fields: [
    ],
    field_type: [
    ],
  },
  { // TABLE_UNUSED7
    name: "",
    fields: [
    ],
    field_type: [
    ],
  },
  { // TABLE_ASSEMBLY
    name: "Assembly",
    fields: [
      "HashId",
      "Major",
      "Minor",
      "BuildNumber",
      "RevisionNumber",
      "Flags",
      "PublicKey",
      "Name",
      "Culture",
    ],
    field_type: [
      MetaType.UINT32,
      MetaType.UINT16,
      MetaType.UINT16,
      MetaType.UINT16,
      MetaType.UINT16,
      MetaType.UINT32,
      MetaType.BLOB_IDX,
      MetaType.STRING_IDX,
      MetaType.STRING_IDX,
    ],
  },
  { // TABLE_ASSEMBLYPROCESSOR
    name: "AssemblyProcessor",
    fields: [
      "Processor",
    ],
    field_type: [
      MetaType.UINT32,
    ],
  },
  { // TABLE_ASSEMBLYOS
    name: "AssemblyOS",
    fields: [
      "OSPlatformID",
      "OSMajor",
      "OSMinor",
    ],
    field_type: [
      MetaType.UINT32,
      MetaType.UINT32,
      MetaType.UINT32,
    ],
  },
  { // TABLE_ASSEMBLYREF
    name: "AssemblyRef",
    fields: [
      "Major",
      "Minor",
      "Build",
      "Revision",
      "Flags",
      "PublicKeyOrToken",
      "Name",
      "Culture",
      "HashValue",
    ],
    field_type: [
      MetaType.UINT16,
      MetaType.UINT16,
      MetaType.UINT16,
      MetaType.UINT16,
      MetaType.UINT32,
      MetaType.BLOB_IDX,
      MetaType.STRING_IDX,
      MetaType.STRING_IDX,
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_ASSEMBLYREFPROCESSOR
    name: "AssemblyRefProcessor",
    fields: [
      "Processor",
      "AssemblyRef:AssemblyRef",
    ],
    field_type: [
      MetaType.UINT32,
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_ASSEMBLYREFOS
    name: "AssemblyRefOS",
    fields: [
      "OSPlatformID",
      "OSMajorVersion",
      "OSMinorVersion",
      "AssemblyRef:AssemblyRef",
    ],
    field_type: [
      MetaType.UINT32,
      MetaType.UINT32,
      MetaType.UINT32,
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_FILE
    name: "File",
    fields: [
      "Flags",
      "Name",
      "Value",
    ],
    field_type: [
      MetaType.UINT32,
      MetaType.STRING_IDX,
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_EXPORTEDTYPE
    name: "ExportedType",
    fields: [
      "Flags",
      "TypeDefId",
      "TypeName",
      "TypeNameSpace",
      "Implementation",
    ],
    field_type: [
      MetaType.UINT32,
      MetaType.TABLE_IDX,
      MetaType.STRING_IDX,
      MetaType.STRING_IDX,
      MetaType.IMPL_IDX,
    ],
  },
  { // TABLE_MANIFESTRESOURCE
    name: "ManifestResource",
    fields: [
      "Offset",
      "Flags",
      "Name",
      "Implementation",
    ],
    field_type: [
      MetaType.UINT32,
      MetaType.UINT32,
      MetaType.STRING_IDX,
      MetaType.IMPL_IDX,
    ],
  },
  { // TABLE_NESTEDCLASS
    name: "NestedClass",
    fields: [
      "NestedClass:TypeDef",
      "EnclosingClass:TypeDef",
    ],
    field_type: [
      MetaType.TABLE_IDX,
      MetaType.TABLE_IDX,
    ],
  },
  { // TABLE_GENERICPARAM
    name: "GenericParam",
    fields: [
      "Number",
      "Flags",
      "Owner",
      "Name",
    ],
    field_type: [
      MetaType.UINT16,
      MetaType.UINT16,
      MetaType.TABLE_IDX,
      MetaType.STRING_IDX,
    ],
  },
  { // TABLE_METHODSPEC
    name: "MethodSpec",
    fields: [
      "Method",
      "Signature",
    ],
    field_type: [
      MetaType.MDOR_IDX,
      MetaType.BLOB_IDX,
    ],
  },
  { // TABLE_GENERICPARAMCONSTRAINT
    name: "GenericParamConstraint",
    fields: [
      "GenericParam",
      "Constraint",
    ],
    field_type: [
      MetaType.TABLE_IDX,
      MetaType.TDOR_IDX,
    ],
  },
]; // end of TableSchema
/** @const {Array.<Object>} */
var Opcodes = [
  { // 0x00 (Pop0 -> Push0)
    name    : "nop",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x01 (Pop0 -> Push0)
    name    : "break",
    argument: C.InlineNone,
    flow    : C.FLOW_BREAK,
  },
  { // 0x02 (Pop0 -> Push1)
    name    : "ldarg.0",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x03 (Pop0 -> Push1)
    name    : "ldarg.1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x04 (Pop0 -> Push1)
    name    : "ldarg.2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x05 (Pop0 -> Push1)
    name    : "ldarg.3",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x06 (Pop0 -> Push1)
    name    : "ldloc.0",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x07 (Pop0 -> Push1)
    name    : "ldloc.1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x08 (Pop0 -> Push1)
    name    : "ldloc.2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x09 (Pop0 -> Push1)
    name    : "ldloc.3",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0A (Pop1 -> Push0)
    name    : "stloc.0",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0B (Pop1 -> Push0)
    name    : "stloc.1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0C (Pop1 -> Push0)
    name    : "stloc.2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0D (Pop1 -> Push0)
    name    : "stloc.3",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0E (Pop0 -> Push1)
    name    : "ldarg.s",
    argument: C.ShortInlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0F (Pop0 -> PushI)
    name    : "ldarga.s",
    argument: C.ShortInlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x10 (Pop1 -> Push0)
    name    : "starg.s",
    argument: C.ShortInlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x11 (Pop0 -> Push1)
    name    : "ldloc.s",
    argument: C.ShortInlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x12 (Pop0 -> PushI)
    name    : "ldloca.s",
    argument: C.ShortInlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x13 (Pop1 -> Push0)
    name    : "stloc.s",
    argument: C.ShortInlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x14 (Pop0 -> PushRef)
    name    : "ldnull",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x15 (Pop0 -> PushI)
    name    : "ldc.i4.m1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x16 (Pop0 -> PushI)
    name    : "ldc.i4.0",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x17 (Pop0 -> PushI)
    name    : "ldc.i4.1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x18 (Pop0 -> PushI)
    name    : "ldc.i4.2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x19 (Pop0 -> PushI)
    name    : "ldc.i4.3",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x1A (Pop0 -> PushI)
    name    : "ldc.i4.4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x1B (Pop0 -> PushI)
    name    : "ldc.i4.5",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x1C (Pop0 -> PushI)
    name    : "ldc.i4.6",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x1D (Pop0 -> PushI)
    name    : "ldc.i4.7",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x1E (Pop0 -> PushI)
    name    : "ldc.i4.8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x1F (Pop0 -> PushI)
    name    : "ldc.i4.s",
    argument: C.ShortInlineI,
    flow    : C.FLOW_NEXT,
  },
  { // 0x20 (Pop0 -> PushI)
    name    : "ldc.i4",
    argument: C.InlineI,
    flow    : C.FLOW_NEXT,
  },
  { // 0x21 (Pop0 -> PushI8)
    name    : "ldc.i8",
    argument: C.InlineI8,
    flow    : C.FLOW_NEXT,
  },
  { // 0x22 (Pop0 -> PushR4)
    name    : "ldc.r4",
    argument: C.ShortInlineR,
    flow    : C.FLOW_NEXT,
  },
  { // 0x23 (Pop0 -> PushR8)
    name    : "ldc.r8",
    argument: C.InlineR,
    flow    : C.FLOW_NEXT,
  },
  { // 0x24 (Pop0 -> Push0)
    name    : "unused99",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x25 (Pop1 -> Push1+Push1)
    name    : "dup",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x26 (Pop1 -> Push0)
    name    : "pop",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x27 (Pop0 -> Push0)
    name    : "jmp",
    argument: C.InlineMethod,
    flow    : C.FLOW_CALL,
  },
  { // 0x28 (VarPop -> VarPush)
    name    : "call",
    argument: C.InlineMethod,
    flow    : C.FLOW_CALL,
  },
  { // 0x29 (VarPop -> VarPush)
    name    : "calli",
    argument: C.InlineSig,
    flow    : C.FLOW_CALL,
  },
  { // 0x2A (VarPop -> Push0)
    name    : "ret",
    argument: C.InlineNone,
    flow    : C.FLOW_RETURN,
  },
  { // 0x2B (Pop0 -> Push0)
    name    : "br.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_BRANCH,
  },
  { // 0x2C (PopI -> Push0)
    name    : "brfalse.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x2D (PopI -> Push0)
    name    : "brtrue.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x2E (Pop1+Pop1 -> Push0)
    name    : "beq.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x2F (Pop1+Pop1 -> Push0)
    name    : "bge.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x30 (Pop1+Pop1 -> Push0)
    name    : "bgt.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x31 (Pop1+Pop1 -> Push0)
    name    : "ble.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x32 (Pop1+Pop1 -> Push0)
    name    : "blt.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x33 (Pop1+Pop1 -> Push0)
    name    : "bne.un.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x34 (Pop1+Pop1 -> Push0)
    name    : "bge.un.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x35 (Pop1+Pop1 -> Push0)
    name    : "bgt.un.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x36 (Pop1+Pop1 -> Push0)
    name    : "ble.un.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x37 (Pop1+Pop1 -> Push0)
    name    : "blt.un.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x38 (Pop0 -> Push0)
    name    : "br",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_BRANCH,
  },
  { // 0x39 (PopI -> Push0)
    name    : "brfalse",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x3A (PopI -> Push0)
    name    : "brtrue",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x3B (Pop1+Pop1 -> Push0)
    name    : "beq",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x3C (Pop1+Pop1 -> Push0)
    name    : "bge",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x3D (Pop1+Pop1 -> Push0)
    name    : "bgt",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x3E (Pop1+Pop1 -> Push0)
    name    : "ble",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x3F (Pop1+Pop1 -> Push0)
    name    : "blt",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x40 (Pop1+Pop1 -> Push0)
    name    : "bne.un",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x41 (Pop1+Pop1 -> Push0)
    name    : "bge.un",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x42 (Pop1+Pop1 -> Push0)
    name    : "bgt.un",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x43 (Pop1+Pop1 -> Push0)
    name    : "ble.un",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x44 (Pop1+Pop1 -> Push0)
    name    : "blt.un",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x45 (PopI -> Push0)
    name    : "switch",
    argument: C.InlineSwitch,
    flow    : C.FLOW_COND_BRANCH,
  },
  { // 0x46 (PopI -> PushI)
    name    : "ldind.i1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x47 (PopI -> PushI)
    name    : "ldind.u1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x48 (PopI -> PushI)
    name    : "ldind.i2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x49 (PopI -> PushI)
    name    : "ldind.u2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x4A (PopI -> PushI)
    name    : "ldind.i4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x4B (PopI -> PushI)
    name    : "ldind.u4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x4C (PopI -> PushI8)
    name    : "ldind.i8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x4D (PopI -> PushI)
    name    : "ldind.i",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x4E (PopI -> PushR4)
    name    : "ldind.r4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x4F (PopI -> PushR8)
    name    : "ldind.r8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x50 (PopI -> PushRef)
    name    : "ldind.ref",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x51 (PopI+PopI -> Push0)
    name    : "stind.ref",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x52 (PopI+PopI -> Push0)
    name    : "stind.i1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x53 (PopI+PopI -> Push0)
    name    : "stind.i2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x54 (PopI+PopI -> Push0)
    name    : "stind.i4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x55 (PopI+PopI8 -> Push0)
    name    : "stind.i8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x56 (PopI+PopR4 -> Push0)
    name    : "stind.r4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x57 (PopI+PopR8 -> Push0)
    name    : "stind.r8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x58 (Pop1+Pop1 -> Push1)
    name    : "add",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x59 (Pop1+Pop1 -> Push1)
    name    : "sub",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x5A (Pop1+Pop1 -> Push1)
    name    : "mul",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x5B (Pop1+Pop1 -> Push1)
    name    : "div",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x5C (Pop1+Pop1 -> Push1)
    name    : "div.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x5D (Pop1+Pop1 -> Push1)
    name    : "rem",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x5E (Pop1+Pop1 -> Push1)
    name    : "rem.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x5F (Pop1+Pop1 -> Push1)
    name    : "and",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x60 (Pop1+Pop1 -> Push1)
    name    : "or",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x61 (Pop1+Pop1 -> Push1)
    name    : "xor",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x62 (Pop1+Pop1 -> Push1)
    name    : "shl",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x63 (Pop1+Pop1 -> Push1)
    name    : "shr",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x64 (Pop1+Pop1 -> Push1)
    name    : "shr.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x65 (Pop1 -> Push1)
    name    : "neg",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x66 (Pop1 -> Push1)
    name    : "not",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x67 (Pop1 -> PushI)
    name    : "conv.i1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x68 (Pop1 -> PushI)
    name    : "conv.i2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x69 (Pop1 -> PushI)
    name    : "conv.i4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x6A (Pop1 -> PushI8)
    name    : "conv.i8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x6B (Pop1 -> PushR4)
    name    : "conv.r4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x6C (Pop1 -> PushR8)
    name    : "conv.r8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x6D (Pop1 -> PushI)
    name    : "conv.u4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x6E (Pop1 -> PushI8)
    name    : "conv.u8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x6F (VarPop -> VarPush)
    name    : "callvirt",
    argument: C.InlineMethod,
    flow    : C.FLOW_CALL,
  },
  { // 0x70 (PopI+PopI -> Push0)
    name    : "cpobj",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x71 (PopI -> Push1)
    name    : "ldobj",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x72 (Pop0 -> PushRef)
    name    : "ldstr",
    argument: C.InlineString,
    flow    : C.FLOW_NEXT,
  },
  { // 0x73 (VarPop -> PushRef)
    name    : "newobj",
    argument: C.InlineMethod,
    flow    : C.FLOW_CALL,
  },
  { // 0x74 (PopRef -> PushRef)
    name    : "castclass",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x75 (PopRef -> PushI)
    name    : "isinst",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x76 (Pop1 -> PushR8)
    name    : "conv.r.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x77 (Pop0 -> Push0)
    name    : "unused58",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x78 (Pop0 -> Push0)
    name    : "unused1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x79 (PopRef -> PushI)
    name    : "unbox",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x7A (PopRef -> Push0)
    name    : "throw",
    argument: C.InlineNone,
    flow    : C.FLOW_THROW,
  },
  { // 0x7B (PopRef -> Push1)
    name    : "ldfld",
    argument: C.InlineField,
    flow    : C.FLOW_NEXT,
  },
  { // 0x7C (PopRef -> PushI)
    name    : "ldflda",
    argument: C.InlineField,
    flow    : C.FLOW_NEXT,
  },
  { // 0x7D (PopRef+Pop1 -> Push0)
    name    : "stfld",
    argument: C.InlineField,
    flow    : C.FLOW_NEXT,
  },
  { // 0x7E (Pop0 -> Push1)
    name    : "ldsfld",
    argument: C.InlineField,
    flow    : C.FLOW_NEXT,
  },
  { // 0x7F (Pop0 -> PushI)
    name    : "ldsflda",
    argument: C.InlineField,
    flow    : C.FLOW_NEXT,
  },
  { // 0x80 (Pop1 -> Push0)
    name    : "stsfld",
    argument: C.InlineField,
    flow    : C.FLOW_NEXT,
  },
  { // 0x81 (PopI+Pop1 -> Push0)
    name    : "stobj",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x82 (Pop1 -> PushI)
    name    : "conv.ovf.i1.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x83 (Pop1 -> PushI)
    name    : "conv.ovf.i2.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x84 (Pop1 -> PushI)
    name    : "conv.ovf.i4.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x85 (Pop1 -> PushI8)
    name    : "conv.ovf.i8.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x86 (Pop1 -> PushI)
    name    : "conv.ovf.u1.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x87 (Pop1 -> PushI)
    name    : "conv.ovf.u2.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x88 (Pop1 -> PushI)
    name    : "conv.ovf.u4.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x89 (Pop1 -> PushI8)
    name    : "conv.ovf.u8.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x8A (Pop1 -> PushI)
    name    : "conv.ovf.i.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x8B (Pop1 -> PushI)
    name    : "conv.ovf.u.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x8C (Pop1 -> PushRef)
    name    : "box",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x8D (PopI -> PushRef)
    name    : "newarr",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x8E (PopRef -> PushI)
    name    : "ldlen",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x8F (PopRef+PopI -> PushI)
    name    : "ldelema",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x90 (PopRef+PopI -> PushI)
    name    : "ldelem.i1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x91 (PopRef+PopI -> PushI)
    name    : "ldelem.u1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x92 (PopRef+PopI -> PushI)
    name    : "ldelem.i2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x93 (PopRef+PopI -> PushI)
    name    : "ldelem.u2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x94 (PopRef+PopI -> PushI)
    name    : "ldelem.i4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x95 (PopRef+PopI -> PushI)
    name    : "ldelem.u4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x96 (PopRef+PopI -> PushI8)
    name    : "ldelem.i8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x97 (PopRef+PopI -> PushI)
    name    : "ldelem.i",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x98 (PopRef+PopI -> PushR4)
    name    : "ldelem.r4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x99 (PopRef+PopI -> PushR8)
    name    : "ldelem.r8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x9A (PopRef+PopI -> PushRef)
    name    : "ldelem.ref",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x9B (PopRef+PopI+PopI -> Push0)
    name    : "stelem.i",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x9C (PopRef+PopI+PopI -> Push0)
    name    : "stelem.i1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x9D (PopRef+PopI+PopI -> Push0)
    name    : "stelem.i2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x9E (PopRef+PopI+PopI -> Push0)
    name    : "stelem.i4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x9F (PopRef+PopI+PopI8 -> Push0)
    name    : "stelem.i8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xA0 (PopRef+PopI+PopR4 -> Push0)
    name    : "stelem.r4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xA1 (PopRef+PopI+PopR8 -> Push0)
    name    : "stelem.r8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xA2 (PopRef+PopI+PopRef -> Push0)
    name    : "stelem.ref",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xA3 (PopRef+PopI -> Push1)
    name    : "ldelem",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0xA4 (PopRef+PopI+Pop1 -> Push0)
    name    : "stelem",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0xA5 (PopRef -> Push1)
    name    : "unbox.any",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0xA6 (Pop0 -> Push0)
    name    : "unused5",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xA7 (Pop0 -> Push0)
    name    : "unused6",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xA8 (Pop0 -> Push0)
    name    : "unused7",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xA9 (Pop0 -> Push0)
    name    : "unused8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xAA (Pop0 -> Push0)
    name    : "unused9",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xAB (Pop0 -> Push0)
    name    : "unused10",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xAC (Pop0 -> Push0)
    name    : "unused11",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xAD (Pop0 -> Push0)
    name    : "unused12",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xAE (Pop0 -> Push0)
    name    : "unused13",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xAF (Pop0 -> Push0)
    name    : "unused14",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xB0 (Pop0 -> Push0)
    name    : "unused15",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xB1 (Pop0 -> Push0)
    name    : "unused16",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xB2 (Pop0 -> Push0)
    name    : "unused17",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xB3 (Pop1 -> PushI)
    name    : "conv.ovf.i1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xB4 (Pop1 -> PushI)
    name    : "conv.ovf.u1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xB5 (Pop1 -> PushI)
    name    : "conv.ovf.i2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xB6 (Pop1 -> PushI)
    name    : "conv.ovf.u2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xB7 (Pop1 -> PushI)
    name    : "conv.ovf.i4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xB8 (Pop1 -> PushI)
    name    : "conv.ovf.u4",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xB9 (Pop1 -> PushI8)
    name    : "conv.ovf.i8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xBA (Pop1 -> PushI8)
    name    : "conv.ovf.u8",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xBB (Pop0 -> Push0)
    name    : "unused50",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xBC (Pop0 -> Push0)
    name    : "unused18",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xBD (Pop0 -> Push0)
    name    : "unused19",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xBE (Pop0 -> Push0)
    name    : "unused20",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xBF (Pop0 -> Push0)
    name    : "unused21",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xC0 (Pop0 -> Push0)
    name    : "unused22",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xC1 (Pop0 -> Push0)
    name    : "unused23",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xC2 (Pop1 -> PushI)
    name    : "refanyval",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0xC3 (Pop1 -> PushR8)
    name    : "ckfinite",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xC4 (Pop0 -> Push0)
    name    : "unused24",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xC5 (Pop0 -> Push0)
    name    : "unused25",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xC6 (PopI -> Push1)
    name    : "mkrefany",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0xC7 (Pop0 -> Push0)
    name    : "unused59",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xC8 (Pop0 -> Push0)
    name    : "unused60",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xC9 (Pop0 -> Push0)
    name    : "unused61",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xCA (Pop0 -> Push0)
    name    : "unused62",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xCB (Pop0 -> Push0)
    name    : "unused63",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xCC (Pop0 -> Push0)
    name    : "unused64",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xCD (Pop0 -> Push0)
    name    : "unused65",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xCE (Pop0 -> Push0)
    name    : "unused66",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xCF (Pop0 -> Push0)
    name    : "unused67",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xD0 (Pop0 -> PushI)
    name    : "ldtoken",
    argument: C.InlineTok,
    flow    : C.FLOW_NEXT,
  },
  { // 0xD1 (Pop1 -> PushI)
    name    : "conv.u2",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xD2 (Pop1 -> PushI)
    name    : "conv.u1",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xD3 (Pop1 -> PushI)
    name    : "conv.i",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xD4 (Pop1 -> PushI)
    name    : "conv.ovf.i",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xD5 (Pop1 -> PushI)
    name    : "conv.ovf.u",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xD6 (Pop1+Pop1 -> Push1)
    name    : "add.ovf",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xD7 (Pop1+Pop1 -> Push1)
    name    : "add.ovf.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xD8 (Pop1+Pop1 -> Push1)
    name    : "mul.ovf",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xD9 (Pop1+Pop1 -> Push1)
    name    : "mul.ovf.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xDA (Pop1+Pop1 -> Push1)
    name    : "sub.ovf",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xDB (Pop1+Pop1 -> Push1)
    name    : "sub.ovf.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xDC (Pop0 -> Push0)
    name    : "endfinally",
    argument: C.InlineNone,
    flow    : C.FLOW_RETURN,
  },
  { // 0xDD (Pop0 -> Push0)
    name    : "leave",
    argument: C.InlineBrTarget,
    flow    : C.FLOW_BRANCH,
  },
  { // 0xDE (Pop0 -> Push0)
    name    : "leave.s",
    argument: C.ShortInlineBrTarget,
    flow    : C.FLOW_BRANCH,
  },
  { // 0xDF (PopI+PopI -> Push0)
    name    : "stind.i",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xE0 (Pop1 -> PushI)
    name    : "conv.u",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xE1 (Pop0 -> Push0)
    name    : "unused26",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xE2 (Pop0 -> Push0)
    name    : "unused27",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xE3 (Pop0 -> Push0)
    name    : "unused28",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xE4 (Pop0 -> Push0)
    name    : "unused29",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xE5 (Pop0 -> Push0)
    name    : "unused30",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xE6 (Pop0 -> Push0)
    name    : "unused31",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xE7 (Pop0 -> Push0)
    name    : "unused32",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xE8 (Pop0 -> Push0)
    name    : "unused33",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xE9 (Pop0 -> Push0)
    name    : "unused34",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xEA (Pop0 -> Push0)
    name    : "unused35",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xEB (Pop0 -> Push0)
    name    : "unused36",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xEC (Pop0 -> Push0)
    name    : "unused37",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xED (Pop0 -> Push0)
    name    : "unused38",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xEE (Pop0 -> Push0)
    name    : "unused39",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xEF (Pop0 -> Push0)
    name    : "unused40",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xF0 (Pop0 -> Push0)
    name    : "unused41",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xF1 (Pop0 -> Push0)
    name    : "unused42",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xF2 (Pop0 -> Push0)
    name    : "unused43",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xF3 (Pop0 -> Push0)
    name    : "unused44",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xF4 (Pop0 -> Push0)
    name    : "unused45",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xF5 (Pop0 -> Push0)
    name    : "unused46",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xF6 (Pop0 -> Push0)
    name    : "unused47",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xF7 (Pop0 -> Push0)
    name    : "unused48",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0xF8 (Pop0 -> Push0)
    name    : "prefix7",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0xF9 (Pop0 -> Push0)
    name    : "prefix6",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0xFA (Pop0 -> Push0)
    name    : "prefix5",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0xFB (Pop0 -> Push0)
    name    : "prefix4",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0xFC (Pop0 -> Push0)
    name    : "prefix3",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0xFD (Pop0 -> Push0)
    name    : "prefix2",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0xFE (Pop0 -> Push0)
    name    : "prefix1",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0xFF (Pop0 -> Push0)
    name    : "prefixref",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0x00 (Pop0 -> PushI)
    name    : "arglist",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x01 (Pop1+Pop1 -> PushI)
    name    : "ceq",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x02 (Pop1+Pop1 -> PushI)
    name    : "cgt",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x03 (Pop1+Pop1 -> PushI)
    name    : "cgt.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x04 (Pop1+Pop1 -> PushI)
    name    : "clt",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x05 (Pop1+Pop1 -> PushI)
    name    : "clt.un",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x06 (Pop0 -> PushI)
    name    : "ldftn",
    argument: C.InlineMethod,
    flow    : C.FLOW_NEXT,
  },
  { // 0x07 (PopRef -> PushI)
    name    : "ldvirtftn",
    argument: C.InlineMethod,
    flow    : C.FLOW_NEXT,
  },
  { // 0x08 (Pop0 -> Push0)
    name    : "unused56",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x09 (Pop0 -> Push1)
    name    : "ldarg",
    argument: C.InlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0A (Pop0 -> PushI)
    name    : "ldarga",
    argument: C.InlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0B (Pop1 -> Push0)
    name    : "starg",
    argument: C.InlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0C (Pop0 -> Push1)
    name    : "ldloc",
    argument: C.InlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0D (Pop0 -> PushI)
    name    : "ldloca",
    argument: C.InlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0E (Pop1 -> Push0)
    name    : "stloc",
    argument: C.InlineVar,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0F (PopI -> PushI)
    name    : "localloc",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x10 (Pop0 -> Push0)
    name    : "unused57",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x11 (PopI -> Push0)
    name    : "endfilter",
    argument: C.InlineNone,
    flow    : C.FLOW_RETURN,
  },
  { // 0x12 (Pop0 -> Push0)
    name    : "unaligned.",
    argument: C.ShortInlineI,
    flow    : C.FLOW_META,
  },
  { // 0x13 (Pop0 -> Push0)
    name    : "volatile.",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0x14 (Pop0 -> Push0)
    name    : "tail.",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0x15 (PopI -> Push0)
    name    : "initobj",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x16 (Pop0 -> Push0)
    name    : "constrained.",
    argument: C.InlineType,
    flow    : C.FLOW_META,
  },
  { // 0x17 (PopI+PopI+PopI -> Push0)
    name    : "cpblk",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x18 (PopI+PopI+PopI -> Push0)
    name    : "initblk",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x19 (Pop0 -> Push0)
    name    : "no.",
    argument: C.ShortInlineI,
    flow    : C.FLOW_NEXT,
  },
  { // 0x1A (Pop0 -> Push0)
    name    : "rethrow",
    argument: C.InlineNone,
    flow    : C.FLOW_THROW,
  },
  { // 0x1B (Pop0 -> Push0)
    name    : "unused",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x1C (Pop0 -> PushI)
    name    : "sizeof",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x1D (Pop1 -> PushI)
    name    : "refanytype",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x1E (Pop0 -> Push0)
    name    : "readonly.",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0x1F (Pop0 -> Push0)
    name    : "unused53",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x20 (Pop0 -> Push0)
    name    : "unused54",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x21 (Pop0 -> Push0)
    name    : "unused55",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x22 (Pop0 -> Push0)
    name    : "unused70",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x00 (Pop0 -> Push0)
    name    : "illegal",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0x00 (Pop0 -> Push0)
    name    : "endmac",
    argument: C.InlineNone,
    flow    : C.FLOW_META,
  },
  { // 0x00 (VarPop -> VarPush)
    name    : "mono_icall",
    argument: C.ShortInlineI,
    flow    : C.FLOW_NEXT,
  },
  { // 0x01 (Pop1 -> PushI)
    name    : "mono_objaddr",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x02 (Pop0 -> PushI)
    name    : "mono_ldptr",
    argument: C.InlineI,
    flow    : C.FLOW_NEXT,
  },
  { // 0x03 (Pop1 -> PushI)
    name    : "mono_vtaddr",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x04 (Pop0 -> PushRef)
    name    : "mono_newobj",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x05 (PopI -> Push0)
    name    : "mono_retobj",
    argument: C.InlineType,
    flow    : C.FLOW_RETURN,
  },
  { // 0x06 (PopI -> Push1)
    name    : "mono_ldnativeobj",
    argument: C.InlineType,
    flow    : C.FLOW_RETURN,
  },
  { // 0x07 (PopRef -> Push1)
    name    : "mono_cisinst",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x08 (PopRef -> Push1)
    name    : "mono_ccastclass",
    argument: C.InlineType,
    flow    : C.FLOW_NEXT,
  },
  { // 0x09 (Pop0 -> Push0)
    name    : "mono_save_lmf",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0A (Pop0 -> Push0)
    name    : "mono_restore_lmf",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0B (Pop0 -> PushI)
    name    : "mono_classconst",
    argument: C.InlineI,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0C (Pop0 -> Push0)
    name    : "mono_not_taken",
    argument: C.InlineNone,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0D (Pop0 -> PushI)
    name    : "mono_tls",
    argument: C.InlineI,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0E (Pop0 -> PushI)
    name    : "mono_icall_addr",
    argument: C.InlineI,
    flow    : C.FLOW_NEXT,
  },
  { // 0x0F (Pop0 -> PushI)
    name    : "mono_dyn_call",
    argument: C.InlineI,
    flow    : C.FLOW_NEXT,
  },
  { // 0x10 (Pop0 -> Push0)
    name    : "mono_memory_barrier",
    argument: C.InlineI,
    flow    : C.FLOW_NEXT,
  },
]; // end of Opcodes

exports.TableSchema = TableSchema;
exports.MetaType    = MetaType;
exports.C           = C;
exports.Opcodes     = Opcodes;

});require.register("uint64.js", function(module, exports, require, global){
/**
 * Representation of 64 bit unsigned integer
 * @constructor
 */
function U64(hi, lo) {
    this.hi = hi;
    this.lo = lo;
}
U64.from_be32 = function(hi, lo) {
    return new U64(hi, lo);
}
U64.from_le32 = function(lo, hi) {
    return new U64(hi, lo);
}
/**
 * Checks whether a bit is enabled or disabled
 * @param {number} idx
 * @return {boolean}
 */
U64.prototype.at = function(idx) {
    if(idx < 32) {
        return( (this.lo & (1 << idx)) !== 0 );
    }
    else {
        return( (this.hi & (1 << (idx - 32))) !== 0 );
    }
};


/**
 * @param {string} hex
 * @return {string}
 */
function padding32(hex) {
    while( (8 - hex.length) > 0) {
        hex = '0' + hex;
    }
    return hex;
}
/**
 * @return {string}
 */
U64.prototype.toString = function() {
    return '0x' +
        padding32( this.hi.toString(16).toUpperCase() ) +
        padding32( this.lo.toString(16).toUpperCase() );
};

module.exports = U64;


});Clion = require('clion.js');
})();