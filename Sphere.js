/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Eric Shaffer
 */

/**
 * Modified by stonov2 to instead model a sphere
 */

// The two buffers, normal and position
var sphereVertexPositionBuffer;
var sphereVertexNormalBuffer;

// The class that will hold each sphere's unique variables
class SphereStats{
    constructor()
    {
        // Declares the position, velocity, and acceleration
        this.position = glMatrix.vec3.create();
        this.velocity = glMatrix.vec3.create();
        this.acceleration = glMatrix.vec3.create();
        this.color = glMatrix.vec3.create();
        
        // Sets the radius
        this.radius = Math.random()*0.02 + 0.025;

        // Bounciness controls how much of the velocity is kept after bouncing off the floor
        this.bounciness = Math.random()*0.45+0.5;
        
        // Sets the drag and shininess. I decided less bouncy objects should be shinier.
        this.drag = 0.990 + 0.007 * this.bounciness;
        this.shininess = (1-this.bounciness)*0.5;
        
        // Sets up the gravity and mass
        this.mass = Math.random() + 1;
        this.gravity_constant = -0.0008;
        this.Gravity = glMatrix.vec3.create();
        glMatrix.vec3.set(this.Gravity,0.0,this.mass*this.gravity_constant,0.0);
        
        // Sets the color
        glMatrix.vec3.set(this.color,Math.random(),Math.random(),Math.random());
        glMatrix.vec3.normalize(this.color,this.color);
        
        // Set the initial position
        var x = (Math.random()*2-1)*0.8;
        var z =  (Math.random()*2-1)*0.8;
        var y = 0.2+(Math.random()*2-1)*0.1;
        glMatrix.vec3.set(this.position,x,y,z);
        
        // Set the initial velocity
        glMatrix.vec3.set(
            this.velocity,
            Math.random()*((Math.random()>0.5)*2-1)*0.012,
            Math.random() *0.02 + 0.02,
            Math.random()*((Math.random()>0.5)*2-1)*0.012);
        
        // Set the acceleration
        glMatrix.vec3.set(this.acceleration, this.Gravity[0]/this.mass, this.Gravity[1]/this.mass, this.Gravity[2]/this.mass);
    }
    /**
        The reflect function handles collisions
        wall 0: -x
        wall 1:  x
        wall 2: -y
        wall 3:  y
        wall 4: -z
        wall 5:  z
    **/
    reflect(wall)
    {
        // If the ball has collided with -x or x
        if(wall == 0 || wall == 1)
        {
            // Reflect the velocity about the colliding axis
            this.velocity[0] = -this.velocity[0];
            if(wall == 0)
            {
                // Move the ball back to where it should have been
                this.position[0] += -1 + this.radius - this.position[0];
                // Reflect it even further
                this.position[0] += -1 + this.radius - this.position[0];
            }
            else
            {
                // Move the ball back to where it should have been
                this.position[0] -= -1 + this.radius + this.position[0];
                // Reflect it even further
                this.position[0] -= -1 + this.radius + this.position[0];
            }
        }
        
        // If the ball has collided with -y or y
        if(wall == 2 || wall == 3)
        {
            // The factor by which the velocity will be dampened after bouncing
            var factor = this.bounciness;
            if(wall == 3 || !gravity)
            {
                // The velocity shouldn't decrease if the ball bounces off the ceiling
                // or if gravity is disabled
                factor = 1.0;
            }
            // Reflect the velocity about the colliding axis
            this.velocity[1] = -this.velocity[1]*factor;
            if(wall == 2)
            {
                // Move the ball back to where it should have been
                this.position[1] += -1 + this.radius - this.position[1];
                // Reflect it even further
                this.position[1] += (-1 + this.radius - this.position[1])*factor;
            }
            else
            {
                // Move the ball back to where it should have been
                this.position[1] -= -1 + this.radius + this.position[1];
                // Reflect it even further
                this.position[1] -= (-1 + this.radius + this.position[1])*factor;
            }
        }
        
        // If the ball has collided with -z or z
        if(wall == 4 || wall == 5)
        {
            // Reflect the velocity about the colliding axis
            this.velocity[2] = -this.velocity[2];
            if(wall == 4)
            {
                // Move the ball back to where it should have been
                this.position[2] += -1 + this.radius - this.position[2];
                // Reflect it even further
                this.position[2] += -1 + this.radius - this.position[2];
            }
            else
            {
                // Move the ball back to where it should have been
                this.position[2] -= -1 + this.radius + this.position[2];
                // Reflect it even further
                this.position[2] -= -1 + this.radius + this.position[2];
            }
        } 
    }
    
    /**
    * The function that detects collision and updates the velocity and position
    * according to Euler integration
    */ 
    updatePosition()
    {
        // Update the gravity and acceleration
        glMatrix.vec3.set(this.Gravity,0.0,this.mass*this.gravity_constant*gravity,0.0);
        glMatrix.vec3.set(this.acceleration, this.Gravity[0]/this.mass, this.Gravity[1]/this.mass, this.Gravity[2]/this.mass);
        
        // Update the velocity
        // v = v*d^t + a*t      where t is each frame
        this.velocity[0] = this.velocity[0] * this.drag + this.acceleration[0];
        this.velocity[1] = this.velocity[1] * this.drag + this.acceleration[1];
        this.velocity[2] = this.velocity[2] * this.drag + this.acceleration[2];
        
        // Update the position
        // x = x + v*t          where t is each frame
        this.position[0] = this.position[0] + this.velocity[0];
        this.position[1] = this.position[1] + this.velocity[1];
        this.position[2] = this.position[2] + this.velocity[2];
        
        // If the ball collides with the -x wall
        if(this.position[0]<-1+this.radius)
        {
            // Simulate the reflection
            this.reflect(0);
        }
        
        // If the ball collides with the +x wall
        if(this.position[0]>1-this.radius)
        {
            // Simulate the reflection
            this.reflect(1);
        }
        
        // -y
        if(this.position[1]<-1+this.radius)
        {
            this.reflect(2);
        }
        
        // +y
        if(this.position[1]>1-this.radius)
        {
            this.reflect(3);
        }
        
        // -z
        if(this.position[2]<-1+this.radius)
        {
            this.reflect(4);
        }
        
        // +z
        if(this.position[2]>1-this.radius)
        {
            this.reflect(5);
        }
    }
}

/** Class implementing a sphere. */
class Sphere{   
    constructor(){
        // Allocate vertex array
        this.vBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Generate a sphere mesh
        this.generateSphere();
        
        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and the simulation cannot proceed.");
        }
    }
    
    /**
    * Render the sphere
    */  
    drawSphere(){
     gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
     gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, 
                             gl.FLOAT, false, 0, 0);

     // Bind normal buffer
     gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
     gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                               sphereVertexNormalBuffer.itemSize,
                               gl.FLOAT, false, 0, 0);
     gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);   
    }
    
    /**
    * Populate the vBuffer and nBuffer with a sphere mesh
    */ 
    generateSphere()
    {
        this.numVertices=sphereFromSubdivision(6,this.vBuffer,this.nBuffer,0.008);
    }
    
    /**
    * Load the buffers into webGl
    */ 
    loadSphereBuffers()
    {
        // Specify the vertex coordinates
        var numT=sphereFromSubdivision(6,this.vBuffer,this.nBuffer);
        console.log("Generated ", numT, " triangles"); 
        sphereVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        sphereVertexPositionBuffer.itemSize = 3;
        sphereVertexPositionBuffer.numItems = numT*3;
        console.log(this.vBuffer.length/9);

        // Specify normals to be able to do lighting calculations
        sphereVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                      gl.STATIC_DRAW);
        sphereVertexNormalBuffer.itemSize = 3;
        sphereVertexNormalBuffer.numItems = numT*3;
    }
}
