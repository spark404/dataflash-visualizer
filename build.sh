#!/bin/bash

lessc less/customize.less web/css/customize.css

# Do npm install to update all the required modules
( 
	cd aws
	
	rm -f *zip
	
	for name in dataflash* 
	do
		(
			cd $name
			npm install
		)
	done
)