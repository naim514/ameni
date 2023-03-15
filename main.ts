input.onButtonPressed(Button.A, function () {
    WiFiIoT.sendGenericHttp(
    naim_ESP8266ThingSpeak.httpMethod.GET,
    "https://api.thingspeak.com/channels/1028055/feeds.json?api_key=1IFCE89OOGQ27NXI&results=1",
    ""
    )
})
WiFiIoT.on_HTTP_recevid(function (HTTP_Status_Code, Data) {
    basic.showString(WiFiIoT.get_value("field1", WiFiIoT.get_value("feeds", Data)))
})
naim_ESP8266ThingSpeak.connectWifi(
SerialPin.P8,
SerialPin.P12,
BaudRate.BaudRate115200,
"Ooredoo 4G_DE143A",
"21554265"
)
