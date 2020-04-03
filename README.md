# Meshknecht

Converts glTF, glTF (embedded), glb and obj (optional with mtl) files to Primo 3D files (.p3d). Usually one Primo 3D file per material. It also exports .txt files for material details for each p3d file.

## Command-Line-Options

|Option|Description|Required|
|----|-----------|--------|
|`--help`, `-h`|Display help|No|
|`--input`, `-i`|Path to the obj, glTF or glb file.<br>glTF -  Note! the corresponding .bin file must be in the same directory as the gltf file. In case of embedded gltf all incorporated textures (images) are exported / extracted as well.<br> glb - In case of .glb files all incorporated textures (images) get extracted. |Yes|
|`--mtl`, `-m`|Path to mtl file. |No|
|`--output`, `-o`|Output path in which alle generated files get stored. default is ./out. |No|
|`--normalize`, `-n`|scales / moves all vertice coordinates / positions into [-1,1] range.|No|
|`--zoom`, `-z`|Scale vertice coordinates with this factor, applied after optional normalize.|No|
|`--merge`, `-m`|Merges all meshes with the same material into one single mesh.|No|

# Build Node CLI Version



# Build Executable From Source

Meshknecht is based heavily on [three.js](https://threejs.org/) and implemented by using [Node.js](http://nodejs.org/). Tested with NodeJS V12.

## Prerequisites

You will need the following things properly installed on your computer.
* [Node.js](http://nodejs.org/) (with NPM)
* [Pkg](https://github.com/zeit/pkg#readme)
  
## Building Steps
```
cd < primo-meshknecht >
```
```
npm install -g pkg
```
```
npm install
```
```
pkg . -t mac        //other targets: win, linux
```   
