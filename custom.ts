/**
 * MakeCode extension for ESP8266 Wifi modules and ThinkSpeak website https://thingspeak.com/
 */
//% color=#009b5b icon="\uf1eb" block="ESP8266 ThingSpeak"
namespace naim_ESP8266ThingSpeak {

    let wifi_connected: boolean = false
    let thingspeak_connected: boolean = false
    let array_values: Array<string> = []
    let array_keys: Array<string> = []
    let last_upload_successful: boolean = false
    let HTTP_received: (Error_code: string, Data: string) => void = null;
    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 100) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
    }

    // wait for certain response from ESP8266
    function waitResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200) serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("OK") || serial_str.includes("ALREADY CONNECTED")) {
                result = true
                break
            } else if (serial_str.includes("ERROR") || serial_str.includes("SEND FAIL")) {
                break
            }
            if (input.runningTime() - time > 30000) break
        }
        return result
    }
    export enum httpMethod {
        //% block="GET"
        GET,
        //% block="POST"
        POST





    }


    /**
    * Initialize ESP8266 module and connect it to Wifi router
    */
    //% block="Initialize ESP8266|RX (Tx of micro:bit) %tx|TX (Rx of micro:bit) %rx|Baud rate %baudrate|Wifi SSID = %ssid|Wifi PW = %pw"
    //% tx.defl=SerialPin.P0
    //% rx.defl=SerialPin.P1
    //% ssid.defl=your_ssid
    //% pw.defl=your_pw
    export function connectWifi(tx: SerialPin, rx: SerialPin, baudrate: BaudRate, ssid: string, pw: string) {
        wifi_connected = false
        thingspeak_connected = false
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+CWMODE=1") // set to STA mode
        sendAT("AT+RST", 1000) // reset
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router
        wifi_connected = waitResponse()
        basic.pause(100)
    }
    /**
           * Connect to ThingSpeak and upload data. It would not upload anything if it failed to connect to Wifi or ThingSpeak.
           */
    //% block="Upload data to ThingSpeak|URL/IP = %ip|Write API key = %write_api_key|Field 1 = %n1|Field 2 = %n2|Field 3 = %n3|Field 4 = %n4|Field 5 = %n5|Field 6 = %n6|Field 7 = %n7|Field 8 = %n8"
    //% ip.defl=api.thingspeak.com
    //% write_api_key.defl=your_write_api_key
    export function connectThingSpeak(ip: string, write_api_key: string, n1: number, n2: number, n3: number, n4: number, n5: number, n6: number, n7: number, n8: number) {
        if (wifi_connected && write_api_key != "") {
            thingspeak_connected = false
            sendAT("AT+CIPSTART=\"TCP\",\"" + ip + "\",80", 0) // connect to website server
            thingspeak_connected = waitResponse()
            basic.pause(100)
            if (thingspeak_connected) {
                last_upload_successful = false
                let str: string = "GET /update?api_key=" + write_api_key + "&field1=" + n1 + "&field2=" + n2 + "&field3=" + n3 + "&field4=" + n4 + "&field5=" + n5 + "&field6=" + n6 + "&field7=" + n7 + "&field8=" + n8
                sendAT("AT+CIPSEND=" + (str.length + 2))
                sendAT(str, 0) // upload data
                last_upload_successful = waitResponse()
                basic.pause(100)
            }
        }
    }

    /**
     * Use IoT:bit to send the HTTP request, input the URL of your API.
     * The Body content only available for POST method.
     * The POST Body Content-Type was "application/json",
     * DO NOT include "&" symbol in the JSON content.
     * 
     */
    //%subcategory="IoT Services"
    //%blockId=wifi_ext_board_generic_http
    //% block="Send HTTP Request |Method %method|URL:%url|Body:%body"
    //% weight=115   group="HTTP" 
    //% inlineInputMode=external
    export function sendGenericHttp(method: httpMethod, url: string, body: string): void {
        //httpReturnArray = []
        let temp = ""
        switch (method) {
            case httpMethod.GET:
                temp = "GET"
                break
            case httpMethod.POST:
                temp = "POST"
                break





        }
        serial.writeLine("(AT+http?method=" + temp + "&url=" + url + "&header=" + "&body=" + body + ")");
    }

    /**
     * After sending the HTTP request, the response will be return to this handler, you may access the http stauts code and the return body.
     */

    //%subcategory="IoT Services"
    //% blockId="wifi_ext_board_http_receive" 
    //% block="On HTTP received"     group="HTTP"
    //% weight=108 draggableParameters=reporter
    //% blockGap=20

    export function on_HTTP_recevid(handler: (HTTP_Status_Code: string, Data: string) => void): void {
        HTTP_received = handler;
    }

    /**
     * This function can extract the value of specific key from a JSON format String.
     * Fill in the Key field that you are searching from json_object, then put the source into the Source placeholder(e.g HTTP return Data).
     * It will search the key from Source string and return the corresponding value.
     * When using at the mulit-level JSON, you need to use this function several time to extract the value one by one level.
     * @param target Key that looking for
     * @param source Source string that to be extract from
     */
    //%subcategory="IoT Services"
    //% blockId="JSON_extractor"
    //%block="Get value of Key %target from JSON String %source"
    //% weight=107 group="HTTP"
    export function get_value(target: string, source: string): string {

        //clear the keys & values array
        array_keys = []
        array_values = []
        //prase the JSON String to Object
        let json_object = JSON.parse(source)
        //Get the count of keys for the For-Loop to run
        let total_keys = Object.keys(json_object).length
        // Start work on each keys
        for (let i = 0; i < total_keys; i++) {
            //Push each key from JSON Object to keys array
            array_keys.push(Object.keys(json_object)[i])
            // Check the corresponding value of the key from Object, 
            // if it is string or number type, push it to value array as normal
            if ((typeof (json_object[array_keys[array_keys.length - 1]]) == "string") || (typeof (json_object[array_keys[array_keys.length - 1]]) == "number")) {
                //push the string or number value to array
                array_values.push(json_object[array_keys[array_keys.length - 1]])

            }
            // if the value is a Object type, mostly is next level JSON object
            else if (typeof (json_object[array_keys[array_keys.length - 1]]) == "object") {
                //Use stringify to convert it back to string, allow to return the stringify object to user,
                //User can perform JSON prase function again later, while the source can set as this return string
                array_values.push(JSON.stringify(json_object[array_keys[array_keys.length - 1]]))

            }
        }
        //After input all the data, search the target's key index
        let target_index = array_keys.indexOf(target)
        //Return the value of that key
        return array_values[target_index]

    }







































    /**
    * Wait between uploads
    */
    //% block="Wait %delay ms"
    //% delay.min=0 delay.defl=5000
    export function wait(delay: number) {
        if (delay > 0) basic.pause(delay)
    }

    /**
    * Check if ESP8266 successfully connected to Wifi
    */
    //% block="Wifi connected ?"
    export function isWifiConnected() {
        return wifi_connected
    }

    /**
    * Check if ESP8266 successfully connected to ThingSpeak
    */
    //% block="ThingSpeak connected ?"
    export function isThingSpeakConnected() {
        return thingspeak_connected
    }

    /**
    * Check if ESP8266 successfully uploaded data to ThingSpeak
    */
    //% block="Last data upload successful ?"
    export function isLastUploadSuccessful() {
        return last_upload_successful
    }

}



