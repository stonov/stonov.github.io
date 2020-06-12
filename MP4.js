
/**
 * @file A simple WebGL example of a physics engine
 * @author Simon Tonov
 * Modified from Professor Shaffer's terrain generation example
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = glMatrix.mat4.create();

/** @global The Projection matrix */
var pMatrix = glMatrix.mat4.create();

/** @global The Normal matrix */
var nMatrix = glMatrix.mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global The angle of rotation around the y axis */
var viewRot = 0; 

/** @global The booleans for the keys */
var left_key = 0;
var right_key = 0;
var space_key = 0;
var r_key = 0;

/** @global Gravity boolean */
var gravity = 1;

// Time used for updating the position
var oldTime = Date.now();

/** @global An array to hold the stats for each sphere, and the sphere model */
var Spheres = [];
var SphereMesh;

// View parameters (set so that it looks like you're in the scene)
/** @global Location of the camera in world coordinates */
var eyePt = glMatrix.vec3.fromValues(0.0,0.0,3.5);
/** @global Direction of the view in world coordinates */
var viewDir = glMatrix.vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = glMatrix.vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = glMatrix.vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0,0,-3.5];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[1,1,1];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.5,0.5,0.5];
/** @global Shininess exponent for Phong reflection */
var shininess = 40;



//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  glMatrix.mat3.fromMat4(nMatrix,mvMatrix);
  glMatrix.mat3.transpose(nMatrix,nMatrix);
  glMatrix.mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = glMatrix.mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");    
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");  
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Add a new sphere to the spherestats array
 */
function addSphere()
{
    var temp = new SphereStats();
    Spheres.push(temp);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    SphereMesh = new Sphere();
    SphereMesh.loadSphereBuffers();
    
    // Generate 20 spheres
    for(var i = 0; i < 20; i+=1)
    {
        addSphere();
    }
}

//----------------------------------------------------------------------------------
/**
 * Function that handles key presses
 */
function keyCheck(event)
{
    var KeyID = event.keyCode;
    left_key = (KeyID == 37);
    right_key = (KeyID == 39);
    space_key = (KeyID == 32);
    r_key = (KeyID == 82);
}
//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    glMatrix.mat4.perspective(pMatrix,degToRad(45), 
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 200.0);
    
    // Draw each sphere individually from the sphere stats array
    for(var i = 0; i < Spheres.length; i+=1)
    {
        drawSphere(SphereMesh,Spheres[i]);
        
        // Update the position each frame
        Spheres[i].updatePosition();
    }
  
}

//----------------------------------------------------------------------------------
/**
 * Draws a sphere using a sphere mesh and sphere stats
 */
function drawSphere(sphere,spherestats)
{
   
   // We want to look down -z, so create a lookat point in that direction    
    glMatrix.vec3.add(viewPt, eyePt, viewDir);
    
    // Then generate the lookat matrix and initialize the MV matrix to that view
    var transformVec = glMatrix.vec3.create();
    glMatrix.mat4.lookAt(mvMatrix,eyePt,viewPt,up);
    
    //Draw Sphere
    mvPushMatrix();
    
    // Set the transform coordinates to the sphere position
    glMatrix.vec3.set(transformVec,spherestats.position[0],spherestats.position[1],spherestats.position[2]);
    
    // Rotate the transform coordinates according to the user-caused rotation
    glMatrix.vec3.rotateY(transformVec,transformVec,[0,0,0],degToRad(viewRot));
    
    // Translate the sphere according to the transform coordinates
    glMatrix.mat4.translate(mvMatrix, mvMatrix,transformVec);
    
    // Scale the sphere accordingly
    glMatrix.mat4.scale(mvMatrix,mvMatrix,[spherestats.radius*2,spherestats.radius*2,spherestats.radius*2]);
    
    // Set the matrix, light, and material uniforms
    setMatrixUniforms();
    glMatrix.vec3.add(transformVec,lightPosition,transformVec);
    setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
   kSpecular = [spherestats.shininess,spherestats.shininess,spherestats.shininess];
    setMaterialUniforms(shininess,kAmbient,spherestats.color,kSpecular); 
    
    // Draw the sphere
    sphere.drawSphere();
    
    mvPopMatrix(); 
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(28.0/255.0, 117.0/255.0, 68.0/255.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    
    // Adds spheres upon pressing the spacebar
    if(space_key)
    {
        addSphere();
    }
    
    // Removes all spheres upon pressing R
    if(r_key)
    {
        Spheres = [];
    }
    
    // Supports rotation around Y
    if(right_key)
    {
        viewRot += 1;
    }
    if(left_key)
    {
        viewRot -= 1;
    }
    
    // Resets the key values to zero after each frame
    left_key = 0;
    right_key = 0;
    r_key = 0;
    space_key = 0;
    
    // The event that controls if there is gravity or not
    if(document.getElementById("on").checked)
    {
        gravity = 1;
    }
    else
    {
        gravity = 0;
    }
}

