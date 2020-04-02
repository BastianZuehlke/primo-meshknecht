Converts GLTF, GLTF (embedded), GLB and Obj (optional with MTL) files to  Primo 3D files (.p3d). Usually one Primo 3D file per material. It also exports .txt files for material details for each p3d file.

## Command-Line-Options

* --gltf xxx.gltf. Note! the corresponding xxx.bin file must be in the same directory as the gltf file. In case of embedded gltf files all incorporated textures (images) are exported / extracted as well.
* --glb xxx.glb. gltf Binary File. In case of .glb files all incorporated textures (images) are exported / extracted as well.
* --obj xxx.obj file.
* --mtl xxx.mtl. Optional Material file for the obj.
* --norm Option which scales / moves all vertice coordinates / positions into [-1,1] range. This is for the whole bunch of objects.
* --merge Merges all meshes with the same material into one single mesh.


# Build From Source

Meshknecht is based heavily on [three.js](https://threejs.org/) and implemented by using [Node.js](http://nodejs.org/). Tested with NodeJS V12.

## Prerequisites

You will need the following things properly installed on your computer.
* [Node.js](http://nodejs.org/) (with NPM)
* [Pkg](https://github.com/zeit/pkg#readme)
  
## Building Steps
* cd < meshknecht >
* npm install -g pkg
* cd source
* npm install
* pkg . -t win
* cp meshknecht.exe ../
    
# Running Tests
* open new shell
* cd < meshknecht >
* meshknecht.exe --obj samples/obj/flurry/McFLURRY_1.obj --mtl samples/obj/flurry/McFLURRY_1.mtl --output flurry --norm
* meshknecht.exe --obj samples/obj/flurry/McFLURRY_1.obj --mtl samples/obj/flurry/McFLURRY_1.mtl --output flurry --norm --merge
* meshknecht.exe --gltf samples/gltf/Box/glTF/Box.gltf  --output box_gltf --norm
* meshknecht.exe --glb samples/gltf/Box/glTF-Binary/Box.glb  --output box_glb --norm
    