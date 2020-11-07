# NavigationMonitor
Android app to monitor SeaTalk data and provide basic steering control 

Written using NativeScript and the plugin 'nativescript-community/ble'

The Bluetooth LE data channel is used to monitor messages from an
ESP32 based module (Seatalk2NMEA - see repository)

Messages from Seatalk2NMEA are all UTF-8 lines terminated with LF. The
first character indicates the type (and source)

	% is a SeaTalk message in hex eg. %151 02 01 EC 07 (Note the 
		command bit set)
	$ is an NMEA message 
	eg. $GNGGA,001043.00,4404.14036,N,12118.85961,W,1,12,0.98,1113.0,M,-21.3,M,,*47

Messages to Seatalk2NMEA are again UTF-8 lines terminated with LF and 
with the first character indicating the destination:

	% is a SeaTalk message in hex
	$ is an NMEA message 
	> is a command message to Seatalk2NMEA

