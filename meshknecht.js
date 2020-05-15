#!/usr/bin/env node
/* globals THREE: true, Buffer: false, XMLHttpRequest: true, BufferGeometryUtils: false */

const fs = require('fs');
const program = require('commander');
const path = require('path');

THREE = require('three');
require('three/examples/js/loaders/OBJLoader');
require('three/examples/js/loaders/MTLLoader');
require('three/examples/js/loaders/GLTFLoader');
require('three/examples/js/utils/BufferGeometryUtils.js');

program
    .version('0.0.3')
    .option('-i, --input <file>', 'obj, gltf or glb path')
    .option('-m, --mtl <file>', 'Mtl file (optional)')
    .option('-o, --output <path>', 'Output Path')
    .option('-z, --zoom <number>', 'Zoom factor for vertices')
    .option('-n, --norm', 'Normalize vertices [-1,1]')
    .option('-m, --merge', 'Merge meshes with same material')
    .description('https://github.com/BastianZuehlke/primo-meshknecht');

program.parse(process.argv);

//console.log("Node: " + process.version);

let fileObj = null;
let fileGLTF = null;
let fileGLB = null;
let fileMtl = program.mtl;
let outpath = program.output ? program.output : "./out";
let zoom = program.zoom ? program.zoom | 0 : 1;
let norm = program.norm ? program.norm : false;
let merge = program.merge ? program.merge : false;
var dataObj;
var dataMtl;
var mtls;

if (!program.input) {
    console.error("Error: --input mandatory.");
    return;
}

let ext = path.extname(program.input).toLowerCase();

switch (ext) {
    case ".gltf":
        fileGLTF = program.input;
        break;
    case ".glb":
        fileGLB = program.input;
        break;
    case ".obj":
        fileObj = program.input;
        break;
    default:
        console.error("Error: --input format " + ext + " unknown.");
        return;
}

function TextureLoader2(manager) {
    THREE.Loader.call(this, manager);
}

TextureLoader2.prototype = Object.assign(Object.create(THREE.Loader.prototype), {

    constructor: TextureLoader2,

    load: function (url, onLoad, onProgress, onError) {
        var scope = this;
        var texture = new THREE.Texture();
        scope.manager.itemStart(url);

        setTimeout(function () {
            if (onLoad) {
                onLoad(texture);
            }
            //console.log("loaded: " + url);
            scope.manager.itemEnd(url);
        }, 0);

        texture.url = url;
        texture.format = THREE.RGBAFormat;
        texture.needsUpdate = true;

        return texture;
    }
});

function bufferToArrayBufferCycle(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

function newFileLoader() {
    var self = {};
    self.load = function (url, onLoad, onProgress, onError) {
        setTimeout(() => {
            let data;
            if (url.indexOf('data:application/octet-stream;base64,') === 0) {
                data = new Buffer(url.replace('data:application/octet-stream;base64,', ''), 'base64');
            } else {
                data = fs.readFileSync(url);
            }
            let buffer = bufferToArrayBufferCycle(data);
            onLoad(buffer);
        }, 10);
    };

    self.setResponseType = function () { };

    self.setWithCredentials = function () { };

    self.setPath = function (path) {
        console.log("Path:" + path);
    };

    return self;
}

THREE.FileLoader = newFileLoader;
THREE.TextureLoader = TextureLoader2;

let blobs = [];


Blob = function (buffer, mime) {
    mime = mime.type.toLowerCase();
    let png = mime.indexOf("png") !== -1;
    let jpg = (mime.indexOf("jpg") !== -1) || (mime.indexOf("jepg") !== -1);
    let type = png ? "png" : jpg ? "jpg" : mime.split('/')[1];
    let id = "blob:" + blobs.length;
    let blob = { buffer: new Uint8Array(buffer[0]), type: type, id: id };
    blobs.push(blob);
    return blob;
}

URL = function () {};
URL.createObjectURL = function (blob) { return blob.id; };
URL.revokeObjectURL = function () {};


self = { URL: URL };

var _convertObject = (scene, obj) => {
    var i, j;

    //let debugVertices = "";
    //let debugIndices = "";

    var flagEnums = {
        normals: 1 << 8,
        uvs: 2 << 8
    };

    var flags = 0;

    var pos = obj.geometry.getAttribute('position');
    var vs = pos.array;
    var vc = pos.count;

    let fs = obj.geometry.getIndex !== undefined ? obj.geometry.getIndex() : null;
    let fc = 0;

    if (fs) {
        fc = fs.count;
        fs = fs.array;
    }

    var uvs = null;
    var ns = null;

    if (obj.geometry.attributes.uv) {
        uvs = obj.geometry.getAttribute('uv').array;
        flags = flags | flagEnums.uvs;
    }
    if (obj.geometry.attributes.normal) {
        ns = obj.geometry.getAttribute('normal').array;
        flags = flags | flagEnums.normals;
    }

    var minposx = scene._minposx;
    var minposy = scene._minposy;
    var minposz = scene._minposz;

    var maxposx = scene._maxposx;
    var maxposy = scene._maxposy;
    var maxposz = scene._maxposz;

    var deltax = maxposx - minposx;
    var deltay = maxposy - minposy;
    var deltaz = maxposz - minposz;

    var minu0 = Number.MAX_VALUE;
    var maxu0 = -Number.MAX_VALUE;
    var minv0 = Number.MAX_VALUE;
    var maxv0 = -Number.MAX_VALUE;

    var delta = (Math.max(Math.max(deltax, deltay), deltaz)) / zoom * 0.5;

    let offsetX = (maxposx + minposx) * 0.5;
    let offsetY = (maxposy + minposy) * 0.5;
    let offsetZ = (maxposz + minposz) * 0.5;

    minposx = Number.MAX_VALUE;
    minposy = Number.MAX_VALUE;
    minposz = Number.MAX_VALUE;

    maxposx = -Number.MAX_VALUE;
    maxposy = -Number.MAX_VALUE;
    maxposz = -Number.MAX_VALUE;

    for (j = 0; j < vc; j++) {

        if (uvs) {
            i = j * 2;
            uvs[i + 1] = - uvs[i + 1] + 1;
            minu0 = Math.min(uvs[i + 0], minu0);
            minv0 = Math.min(uvs[i + 1], minv0);
            maxu0 = Math.max(uvs[i + 0], maxu0);
            maxv0 = Math.max(uvs[i + 1], maxv0);
        }

        i = j * 3;

        //debugVertices = debugVertices + "x:" + vs[i + 0] + " y:" + vs[i + 1] + " z:" + vs[i + 2] + "|";

        if (norm) {
            vs[i + 0] = (vs[i + 0] - offsetX) / delta;
            vs[i + 1] = (vs[i + 1] - offsetY) / delta;
            vs[i + 2] = (vs[i + 2] - offsetZ) / delta;
        } else {
            vs[i + 0] *= zoom;
            vs[i + 1] *= zoom;
            vs[i + 2] *= zoom;
        }

        minposx = Math.min(vs[i + 0], minposx);
        minposy = Math.min(vs[i + 1], minposy);
        minposz = Math.min(vs[i + 2], minposz);

        maxposx = Math.max(vs[i + 0], maxposx);
        maxposy = Math.max(vs[i + 1], maxposy);
        maxposz = Math.max(vs[i + 2], maxposz);

        //debugVertices = debugVertices + "x:" + vs[i + 0] + " y:" + vs[i + 1] + " z:" + vs[i + 2] + "|";

        //console.log("x:" + vs[i + 0] + " y:" + vs[i + 1] + " z:" + vs[i + 2] );
    }

    deltax = maxposx - minposx;
    deltay = maxposy - minposy;
    deltaz = maxposz - minposz;

    var deltau = maxu0 - minu0;
    var deltav = maxv0 - minv0;

    var vertices = [];
    var indices = [];
    var verticesMap = new Map();
    var indicesMap = [];

    function addVertex(v) {
        let hash = "" + v.vl + v.vu + (v.n !== undefined ? v.n : "") + (v.uv0 !== undefined ? v.uv0 : "");
        let d = verticesMap.get(hash);

        if (d !== undefined) {
            return d;
        }
        v.nb = vertices.length;
        vertices.push(v);
        verticesMap.set(hash, v.nb);
        return v.nb;
    }



    for (j = 0; j < vc; j++) {
        var v = {};

        var iv = j * 3;
        var it = j * 2;

        var x = (vs[iv + 0] - minposx) / deltax;
        var y = (vs[iv + 1] - minposy) / deltay;
        var z = (vs[iv + 2] - minposz) / deltaz;

        x = (x * 262143.0) | 0;
        y = (y * 262143.0) | 0;
        z = (z * 262143.0) | 0;

        var t = (x & 3) | ((y & 3) << 2) | (z & 3 << 4); //6Bit
        x = (x >> 2) & 0xffff;
        y = (y >> 2) & 0xffff;
        z = (z >> 2) & 0xffff;
        v.vl = (t << 16) | x;
        v.vu = (z << 16) | y;

        if (ns) {
            ns[iv + 2] = -ns[iv + 2];
            var nx = ((ns[iv + 0] + 1) * 511.999) | 0;
            var ny = ((ns[iv + 1] + 1) * 511.999) | 0;
            var nz = ((ns[iv + 2] + 1) * 511.999) | 0;
            v.n = nx | (ny << 10) | (nz << 20);
        }

        if (uvs) {
            var tu = (uvs[it + 0] - minu0) / deltau;
            var tv = (uvs[it + 1] - minv0) / deltav;

            tu = (tu * 4095) | 0;
            tv = (tv * 4095) | 0;
            v.uv0 = ((tv & 4095) << 12) | (tu & 4095);
        }


        let nb = addVertex(v);
        if (fs) {
            indicesMap[j] = nb;
        } else {
            indices.push(nb);
        }
    }

    if (fs) {
        for (j = 0; j < fc; j += 3) {
            indices.push(indicesMap[fs[j + 2]]);
            indices.push(indicesMap[fs[j + 1]]);
            indices.push(indicesMap[fs[j + 0]]);
            //debugIndices =  debugIndices + "" + fs[j+0] + "," + fs[j+1] + "," + fs[j+2] + "|";
        }
    } else {
        fc = indices.length / 3;
        for (j = 0; j < fc; j += 3) {            
            var tmp = indices[j + 0];
            indices[j + 0] = indices[j + 2];            
            indices[j + 2] = tmp;
            //debugIndices =  debugIndices + "" + fs[j+0] + "," + fs[j+1] + "," + fs[j+2] + "|";
        }
    }

    var buf = new ArrayBuffer(indices.length * 12 + vertices.length * 32 + 1024);

    var ui32 = new Int32Array(buf);
    var ui16 = new Uint16Array(buf);
    var f32 = new Float32Array(buf);
    var mp = 0;

    function wi(v) {
        ui32[mp >> 2] = v | 0;
        mp += 4;
    }
    function ws(v) {
        ui16[mp >> 1] = v | 0;
        mp += 2;
    }
    function wf(v) {
        f32[mp >> 2] = v;
        mp += 4;
    }


    wi(0);                          //Id
    wi(flags);                      //Flags;
    wi(1);                          //NbClusters;
    wi(vertices.length | (7 >> 24));  //0-23 Bits Nb 24-31 Bits Flags  (1 uv0, 2 uv1, 4 norm, 8 tan + binorm)
    wi(1 | (1 << 4) | (1 << 8));     //CompressionTypes;  //4 Bits 
    wi(0);                          //Version;
    wi(0); wi(0); wi(0);              //Unused[3];      //for futures extensions
    wi(0);                          //MetaDataSize;   //Number of uint    

    wf(minposx);
    wf(minposy);
    wf(minposz);
    wf(deltax);
    wf(deltay);
    wf(deltaz);
    wi(vertices.length);

    for (i = 0; i < vertices.length; i++) {
        wi(vertices[i].vl);
        wi(vertices[i].vu);
    }

    if (ns) {
        wi(vertices.length);
        for (i = 0; i < vertices.length; i++) {
            wi(vertices[i].n);
        }
    }

    if (uvs) {
        wf(minu0);
        wf(minv0);
        wf(deltau);
        wf(deltav);
        wi(vertices.length);
        for (i = 0; i < vertices.length; i++) {
            wi(vertices[i].uv0);
        }
    }

    wi(indices.length);
    for (i = 0; i < indices.length; i++) {
        if (vertices.length < 65535) {
            ws(indices[i]);
        } else {
            wi(indices[i]);
        }
    }

    if (vertices.length < 65535 && indices.length & 1) {
        ws(0x77aa); //Pad
    }

    let info = {
        uv0: !!uvs,
        normals: !!ns,
        triangles: indices.length / 3,
        vertices: vertices.length,
        material: {

        }/*,
        
        debug: {
            debugVertices: debugVertices,
            debugIndices: debugIndices
        }
        */

    };

    function getColor(color) {
        function _g(value) {
            return "" + (value * 255) | 0;
        }
        return _g(color.r) + "," + _g(color.g) + "," + _g(color.b);
    }

    let material = obj.material;
    if (material) {
        let m = info.material;
        if (material.type === "MeshStandardMaterial") {
            m.physicallyBasedMaterial = true;
        }
        if (material.type === "MeshPhongMaterial") {
            m.physicallyBasedMaterial = false;
            m.opacity = material.opacity;
        }

        if (material.emissive !== undefined && material.emissive !== null) {
            m.emissiveColor = getColor(material.emissive);
            m.emissiveIntensity = material.emissiveIntensity;
        }

        if (material.emissiveMap) {
            m.emissiveMap = material.emissiveMap.url;
        }

        if (material.color !== undefined && material.color !== null) {
            m.diffuseColor = getColor(material.color);
        }

        if (material.map) {
            m.diffuseColorMap = material.map.url;
        }

        if (material.aoMap) {
            m.diffuseAOMap = material.aoMap.url;
            m.diffuseAOMapIntensity = material.aoMapIntensity;
        }

        if (material.bumpMap) {
            m.bumpMap = material.bumpMap.url;
            m.bumpMapScale = material.bumpScale;
        }

        if (material.normalMap) {
            m.normalMap = material.normalMap.url;
            m.normalMapScale = "" + material.normalScale.x + "," + material.normalScale.y;
            m.normalMapType = material.normalMapType === THREE.TangentSpaceNormalMap ? "TangentSpace" : "ObjectSpace";
        }

        if (material.envMap) {
            m.envMap = material.envMap.url;
            m.envMapIntensity = material.envMapIntensity;
        }

        if (material.specular !== undefined && material.specular !== null) {
            m.specularColor = getColor(material.specular);
            m.shininess = material.shininess;
        }

        if (material.lightMap) {
            m.lightMap = material.lightMap.url;
            m.lightMapIntensity = material.lightMapIntensity;
        }

        if (material.specularMap) {
            m.specularMap = material.specularMap.url;
        }

        if (material.metalness !== undefined && material.metalness !== null) {
            m.metalness = material.metalness;
        }

        if (material.metalnessMap) {
            m.metalnessMap = material.metalnessMap.url;
        }

        if (material.refractionRatio !== undefined && material.refractionRatio !== null) {
            m.refractionRatio = material.refractionRatio;
        }

        if (material.roughness !== undefined && material.roughness !== null) {
            m.roughness = material.roughness;
        }

        if (material.roughnessMap) {
            m.roughnessMap = material.roughnessMap.url;
        }

        if (material.vertexTangents !== undefined && material.vertexTangents !== null) {
            m.vertexTangents = material.vertexTangents;
        }
    }



    //  console.log("indices: " + indices.length + " vertices: " + vertices.length);

    return { buf: new Uint8Array(buf, 0, mp), size: mp, info: info };
};

function convertAll(scene) {
    var cnt = 1;

    try {
        fs.mkdirSync(outpath);
    } catch (error) {
    }

    scene._meshList.forEach(c => {

        let pad = (String(cnt++).padStart(3, '0'));

        let m = c.material;
        for (const a in m) {
            let p = m[a];
            if (p && typeof p === 'object' && p.url !== undefined) {
                if (p.url.indexOf('data:') === 0) {
                    let mime = p.url.replace('data:', '');
                    mime = mime.substring(0, mime.indexOf(';'));
                    let d = p.url.substring(p.url.indexOf(',') + 1);
                    p.url = new Blob([new Buffer(d, 'base64')], { type: mime }).id;
                }
                if (p.url.indexOf('blob:') === 0) {
                    let b = blobs[p.url.replace('blob:', '') | 0];
                    b.name = pad + "_" + c.name + "_" + m.name + "_" + a + "." + b.type;
                    p.url = b.name;
                }
            }
        }



        var p3d = _convertObject(scene, c);
        var fn = outpath + "/" + pad + "_" + c.name + ".p3d";
        var fnInfo = fn.replace('.p3d', '.txt');

        var msg = "done: " + c.name;
        msg = msg + " (" + fn + ")";
        // msg = msg + " material: " + c.material.id + " " + c.material.uuid;

        try {
            fs.writeFileSync(fn, Buffer.alloc(p3d.size, p3d.buf));
            fs.writeFileSync(fnInfo, JSON.stringify(p3d.info, false, 4));
        } catch (error) {
            console.error("Internal Error!");
        }
        console.log(msg);
    });

    blobs.forEach(b => {
        if (b.name) {
            fs.writeFileSync(outpath + "/" + b.name, b.buffer);

        }
    });
}

function inspectScene(scene) {
    var minposx = Number.MAX_VALUE;
    var minposy = Number.MAX_VALUE;
    var minposz = Number.MAX_VALUE;

    var maxposx = -Number.MAX_VALUE;
    var maxposy = -Number.MAX_VALUE;
    var maxposz = -Number.MAX_VALUE;

    scene._meshList = [];
    var materials = {};

    function inspect(obj) {
        if (obj && obj.geometry) {
            if (merge) {
                if (materials[obj.material.uuid]) {
                    materials[obj.material.uuid].geometry = THREE.BufferGeometryUtils.mergeBufferGeometries([materials[obj.material.uuid].geometry, obj.geometry], false);
                    materials[obj.material.uuid].name += obj.name;
                    materials[obj.material.uuid].name = materials[obj.material.uuid].name.substring(0, 32);

                } else {
                    scene._meshList.push(obj);
                    materials[obj.material.uuid] = obj;
                }
            } else {
                scene._meshList.push(obj);
            }

            let pos = obj.geometry.getAttribute('position');
            let vs = pos.array;
            let vc = pos.count;

            for (let j = 0; j < vc; j++) {
                let i = j * 3;

                vs[i + 2] = -vs[i + 2];

                minposx = Math.min(vs[i + 0], minposx);
                minposy = Math.min(vs[i + 1], minposy);
                minposz = Math.min(vs[i + 2], minposz);

                maxposx = Math.max(vs[i + 0], maxposx);
                maxposy = Math.max(vs[i + 1], maxposy);
                maxposz = Math.max(vs[i + 2], maxposz);
            }
        }
        if (obj.children) {
            obj.children.forEach(e => inspect(e));
        }
    }


    inspect(scene);

    scene._minposx = minposx;
    scene._minposy = minposy;
    scene._minposz = minposz;

    scene._maxposx = maxposx;
    scene._maxposy = maxposy;
    scene._maxposz = maxposz;
}

function execute(scene) {
    try {
        inspectScene(scene);
    } catch (error) {
        console.error(error);
    }
    try {
        convertAll(scene);
    } catch (error) {
        console.error(error);
    }
}



if (fileObj) {
    dataObj = fs.readFileSync(fileObj).toString();

    let assetPath = path.dirname(fileObj) + "/";
    let manager;

    if (fs.existsSync(fileMtl)) {
        dataMtl = fs.readFileSync(fileMtl).toString();

        manager = new THREE.LoadingManager();
        manager.onLoad = () => {
            console.log("Manager!");
        };

        manager.onStart = (url, itemsLoaded, itemsTotal) => {
            console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
        };

        manager.onProgress = function (url, itemsLoaded, itemsTotal) {
            console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
        };


        mtls = new THREE.MTLLoader(manager)
            .setMaterialOptions({
                side: THREE.FrontSide,
                wrap: THREE.ClampToEdgeWrapping,
                normalizeRGB: false,
                ignoreZeroRGBs: false,
                invertTrProperty: false
            })
            .parse(dataMtl, assetPath);
    }

    let loader = new THREE.OBJLoader();
    let scene;

    try {
        if (mtls) {
            loader.setMaterials(mtls);
        }
        scene = loader.parse(dataObj);

        if (mtls && mtls.materialsArray.length > 0 && manager) {
            manager.onLoad = () => {
                execute(scene);
            };
        } else {
            execute(scene);
        }
    } catch (error) {
        console.error(error);
    }
} else if (fileGLTF) {
    dataObj = fs.readFileSync(fileGLTF).toString();
    let assetPath = path.dirname(fileGLTF) + "/";
    let loader = new THREE.GLTFLoader();
    loader.parse(dataObj, assetPath, (gltf) => {
        execute(gltf.scene);
    }, () => { console.log("Error!"); });
} else if (fileGLB) {
    dataObj = bufferToArrayBufferCycle(fs.readFileSync(fileGLB));
    let assetPath = path.dirname(fileGLB) + "/";
    let loader = new THREE.GLTFLoader();
    loader.parse(dataObj, assetPath, (gltf) => {
        execute(gltf.scene);
    }, (x) => {
        console.log("Error!" + x.message);
    });

}












