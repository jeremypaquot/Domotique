#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Renseignez ces valeurs localement. Ne les committez jamais.
const char* WIFI_SSID = "VOTRE_WIFI";
const char* WIFI_PASSWORD = "VOTRE_MOT_DE_PASSE";
const char* WORKER_URL = "https://api-esp32.jeremypaquotdesign.workers.dev/mesures";
const char* API_KEY = ""; // facultatif : laissez vide si le Worker n’en demande pas
constexpr uint8_t DS18B20_PIN = 4;
constexpr unsigned long SEND_INTERVAL_MS = 30UL * 1000UL;

OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);
unsigned long lastSend = 0;

void connectWiFi() { WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_PASSWORD); Serial.print("Connexion Wi-Fi"); for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; ++i) { delay(500); Serial.print('.'); } Serial.println(WiFi.status() == WL_CONNECTED ? " OK" : " échec"); }

void sendTemperature(float temperature) {
  if (WiFi.status() != WL_CONNECTED) { connectWiFi(); if (WiFi.status() != WL_CONNECTED) return; }
  HTTPClient http; if (!http.begin(WORKER_URL)) { Serial.println("URL Worker invalide"); return; }
  http.addHeader("Content-Type", "application/json"); if (strlen(API_KEY) > 0) http.addHeader("Authorization", String("Bearer ") + API_KEY);
  String payload = String("{\"temperature\":") + String(temperature, 2) + "}";
  int status = http.POST(payload); Serial.printf("Envoi température: HTTP %d\n", status); if (status < 200 || status >= 300) Serial.println(http.getString()); http.end();
}

void setup() { Serial.begin(115200); sensors.begin(); connectWiFi(); }
void loop() { if (millis() - lastSend < SEND_INTERVAL_MS) { delay(100); return; } lastSend = millis(); sensors.requestTemperatures(); float temperature = sensors.getTempCByIndex(0); if (temperature == DEVICE_DISCONNECTED_C) { Serial.println("DS18B20 introuvable"); return; } sendTemperature(temperature); }
