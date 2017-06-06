precision mediump float;
varying vec2 vUv;
varying vec3 vPos;
uniform sampler2D uSampler;
uniform mat4 mvpInverse;
uniform float time;
uniform vec3 cam;
uniform vec2 screen;

vec4 sphere = vec4(0.0, 0.0, 0.0,1.2);
#define EXPLOSION_SEED 0.
float expRadius;
vec3 expCenter;
float hash(vec3 p)  // replace this by something better
{
    p  = fract( p*0.3183099+.1 );
	p *= 17.0;
    return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
}

float noise( in vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
	
    return mix(mix(mix( hash(p+vec3(0,0,0)), 
                        hash(p+vec3(1,0,0)),f.x),
                   mix( hash(p+vec3(0,1,0)), 
                        hash(p+vec3(1,1,0)),f.x),f.y),
               mix(mix( hash(p+vec3(0,0,1)), 
                        hash(p+vec3(1,0,1)),f.x),
                   mix( hash(p+vec3(0,1,1)), 
                        hash(p+vec3(1,1,1)),f.x),f.y),f.z);
}

// assign colour to the media
vec3 computeColour( float density, float radius )
{
	// these are almost identical to the values used by iq
	
	// colour based on density alone. gives impression of occlusion within
	// the media
	vec3 result = mix( 1.1*vec3(1.0,0.9,0.8), vec3(0.4,0.15,0.1), density );
	
	// colour added for explosion
	vec3 colBottom = 3.1*vec3(1.0,0.5,0.05);
	vec3 colTop = 2.*vec3(0.48,0.53,0.5);
	result *= mix( colBottom, colTop, min( (radius*1.75+.5)/1.7, 1.0 ) );
	
	return result;
}
vec3 snoiseVec3( vec3 x ){

  float s  = noise(vec3( x ));
  float s1 = noise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
  float s2 = noise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
  vec3 c = vec3( s , s1 , s2 );
  return c;

}
vec3 curlNoise( vec3 p ){
  
  const float e = .1;
  vec3 dx = vec3( e   , 0.0 , 0.0 );
  vec3 dy = vec3( 0.0 , e   , 0.0 );
  vec3 dz = vec3( 0.0 , 0.0 , e   );

  vec3 p_x0 = snoiseVec3( p - dx );
  vec3 p_x1 = snoiseVec3( p + dx );
  vec3 p_y0 = snoiseVec3( p - dy );
  vec3 p_y1 = snoiseVec3( p + dy );
  vec3 p_z0 = snoiseVec3( p - dz );
  vec3 p_z1 = snoiseVec3( p + dz );

  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

  const float divisor = 1.0 / ( 2.0 * e );
  return normalize( vec3( x , y , z ) * divisor );

}

// maps 3d position to colour and density
float densityFn( in vec3 p, in float r, out float rawDens, in float rayAlpha )
{
p*=0.75;
    p.xyz +=time;
    p+=curlNoise(p+time)*0.15;
	// density has dependency on mouse y coordinate (linear radial ramp)
	float mouseIn = 0.3;

    float den = -0.1 - 1.5*r*(4.*0.2+.5);
    
	// offset noise based on seed
    float t = EXPLOSION_SEED;
    vec3 dir = vec3(0.,1.,0.);
    
    // participating media    
    float f;
    vec3 q = p - dir* t; f  = 0.50000*noise( q );
	q = q*2.02 - dir* t; f += 0.25000*noise( q );
	q = q*2.03 - dir* t; f += 0.12500*noise( q );
	q = q*2.01 - dir* t; f += 0.06250*noise( q );
	q = q*2.02 - dir* t; f += 0.03125*noise( q );
	
	// add in noise with scale factor
	rawDens = den + 4.0*f;
	
    den = clamp( rawDens, 0.0, 1.0 );
    
	// thin out the volume at the far extends of the bounding sphere to avoid
	// clipping with the bounding sphere
	den *= 1.-smoothstep(0.8,1.,r/expRadius);
	
	#ifdef CROSS_SECTION
	den *= smoothstep(.0,.1,-p.x);
	#endif
	
	return den;
}

float fractal_noise(vec3 p)
{
    float f = 0.0;
    // add animation
    p = p - vec3(1.0, 1.0, 0.0) * time * 0.1;
    p = p * 3.0;
    f += 0.50000 * noise(p); p = 2.0 * p;
	f += 0.25000 * noise(p); p = 2.0 * p;
	f += 0.12500 * noise(p); p = 2.0 * p;
	f += 0.06250 * noise(p); p = 2.0 * p;
    f += 0.03125 * noise(p);
    
    return f;
}

float sphIntersect( vec3 ro, vec3 rd, vec4 sph )
{
    vec3 oc = ro - sph.xyz;
    float b = dot( oc, rd );
    float c = dot( oc, oc ) - sph.w*sph.w;
    float h = b*b - c;
    if( h<0.0 ) return -1.0;
    h = sqrt( h );
    return -b - h;
}

float density(vec3 pos, float dist)
{    
    float den = -0.2 - dist * 1.5 + 3.0 * fractal_noise(pos);
    den = clamp(den, 0.0, 1.0);
    float size = clamp( 2.0 + 0.1, 0.4, 0.8);
    float edge = 1.0 - smoothstep(size*sphere.w, sphere.w, dist);
    edge *= edge;
    den *= edge;
    return den;
}

vec3 color(float den, float dist)
{
    // add animation
    vec3 result = mix(vec3(1.0, 0.9, 0.8 + sin(time) * 0.1), 
                      vec3(0.5, 0.15, 0.1 + sin(time) * 0.1), den * den);
    
    vec3 colBot = 3.0 * vec3(1.0, 0.9, 0.5);
	vec3 colTop = 2.0 * vec3(0.5, 0.55, 0.55);
    result *= mix(colBot, colTop, min((dist+0.5)/sphere.w, 1.0));
    return result;
}

vec4 raymarching(vec3 ro, vec3 rd, float t)
{
    vec4 sum = vec4(0.0);
    vec3 pos = ro + rd * t;
    for (int i = 0; i < 30; i++) {
	        if ( sum.a > 0.99) break;
		float radiusFromExpCenter = length(pos - expCenter);
		
		if( radiusFromExpCenter > expRadius+0.01 ) break;
		float rawDens;
        float dens = densityFn( pos, radiusFromExpCenter, rawDens, sum.a );

				vec4 col = vec4( computeColour(dens,radiusFromExpCenter), dens );
						col.a *= 0.6;

        col.rgb *= col.a;
        sum = sum + col*(1.0 - sum.a); 
        
        t += max(0.05, 0.02 * t);
        pos = ro + rd * t;
    }
    
    sum = clamp(sum, 0.0, 1.0);
    return sum;
}



float torus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

vec3 opTwist(vec3 p) {
  float c = cos(sin(time)*10.0*p.y);
  float s = sin(sin(time)*10.0*p.y);
  mat2 m = mat2(c, -s, s, c);
  return vec3(m * p.xz, p.y);
}

float map(vec3 p) {
  vec3 c = vec3(2.0);
  vec3 q = mod(p, c) - 0.5 * c;

  return torus(opTwist(q), vec2(0.3, 0.1));
}

float trace(vec3 o, vec3 r) {
  float t = 0.0;

  for (int i=0; i<32; i++) {
    vec3 p = o + r * t;

    float d = map(p);

    t += d * 0.5;
  }

  return t;
}

vec4 calculateClipPos(){
	vec4 ndcPos;
	ndcPos.xy = (2.0 * gl_FragCoord.xy)/screen -1.0;
	ndcPos.z = (2.0 * gl_FragCoord.z - gl_DepthRange.near - gl_DepthRange.far) /(gl_DepthRange.far - gl_DepthRange.near);
	ndcPos.w = 1.0;
	vec4 clipPos = ndcPos / gl_FragCoord.w;
	return clipPos;
}           

void main(void) {

    expRadius = 1.;
	expCenter = vec3(0.);
	vec4 clipPos = calculateClipPos();
	gl_FragColor = texture2D(uSampler, vUv);
	vec3 worldPos = (mvpInverse*clipPos).xyz;
	vec3 camVec = normalize(worldPos-cam);
	//float t = trace(worldPos, camVec);
	//gl_FragColor = gl_FragColor*vec4(abs(mvpInverse*clipPos).xyz,1);
	//float fog = 1.0 / (1.0 + t * t * 0.1);
	//vec3 fc = vec3(1.0 - fog) * vec3(0.4, 0.8, 0.9);
	vec3 ro = worldPos;
	vec3 rd = camVec;
	float dist = sphIntersect(ro, rd, vec4(expCenter,expRadius));
    vec4 col = vec4(0.0);
    if (dist > 0.0) {
        col = raymarching(ro, rd, dist);
    }
	gl_FragColor.xyz = col.xyz*col.xyz*(3.0-2.0*col.xyz);
	gl_FragColor.a = col.a;
}
