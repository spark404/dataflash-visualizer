#!/bin/bash

if [ ! -d "build" ]
then
	mkdir build
fi

lessc less/customize.less web/css/customize.css

( 
	cd aws
	
	rm -f *zip
	
	for name in dataflash* 
	do
		(
			cd $name
			npm install
			zip -r ../../build/${name}.zip .
		)
	done
)