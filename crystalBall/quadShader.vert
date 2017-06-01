attribute vec3 coordinate;
void main(void) 
{
	gl_Position = vec4(coordinate, 1.0);
}