handlers.currTimeSeconds = function()
{
	var now = new Date();
	return now.getTime() / 1000;
}

handlers.currTime = function()
{
	var now = new Date();
	return now;
}
