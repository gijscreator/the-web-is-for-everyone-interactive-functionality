# Bloemenveld Frankendael

Voor het Bloemenveld Frankendael ontwikkel ik een webapplicatie die bezoekers helpt de bloemen en planten in het park te ontdekken. De focus ligt op planten die op dit moment in bloei staan. De app gaat verder dan alleen informatie via interactieve opdrachten leren gebruikers de specifieke kenmerken van planten herkennen, wat zorgt voor een actieve en educatieve ervaring in het veld.

De focus lag hierbij op het implementeren van robuuste GET- en POST-methoden om een goede gebruikerservaring te creëren.

POST-methode
In plaats van statische informatie, heb ik een interactieve flow ontwikkeld waarbij de POST-methode drie acties tegelijkertijd afhandelt zodra een gebruiker een opdracht voltooit:

Registratie: De voltooiing van de specifieke opdracht wordt direct vastgelegd in de database.

Plant naar de collectie: De betreffende plant wordt toegevoegd aan de persoonlijke collectie van de gebruiker (gamification).

Veldverkenner Update: De status van de betreffende zone op de veldverkenner wordt bijgewerkt, waardoor de voortgang van de bezoeker visueel zichtbaar wordt op de kaart.

Data-ophaling (GET)
Middels GET-verzoeken zorg ik ervoor dat de app altijd de meest actuele plantkenmerken en zonestatussen toont, zodat de informatie in het veld synchroon loopt met de database omgeving.

Developer

@GijsNagtegaal

## Inhoudsopgave

## Beschrijving

Hieronder is een video te zien hoe de opdrachten flow werkt:

https://github.com/user-attachments/assets/101e9597-13df-40ca-96e8-2285e6c9f39d

Verder heb ik me gefocussed op de algemene flow van de gebruiker. Hieronder een aantal afbeeldingen over hoe de ui er nu uit ziet:

Ik heb een ander design gemaakt en gekozen in overleg met de opdrachtgever, 
dit omdat ik aan meerdere personen heb gevraagd of zij het duidelijk vonden hoe je opdrachten kan doen en meer informatie kan vinden over een plant. 
Uiteindelijk ben ik op dit design gekomen:


<img width="698" height="445" alt="Screenshot 2026-04-02 at 13 22 40" src="https://github.com/user-attachments/assets/7ce615ed-3767-4032-a380-d0e78020604f" />
<img width="628" height="722" alt="Screenshot 2026-04-02 at 13 22 35" src="https://github.com/user-attachments/assets/ec7cd1b1-b09a-4b21-b245-c07dfe29d4a6" />



De live site is hier te vinden: https://the-web-is-for-everyone-interactive-hz3r.onrender.com/

## Gebruik
<!-- Bij Gebruik staat de user story, hoe het werkt en wat je er mee kan. -->

Het uiteindelijke doel van de webapp is dat gebruikers van de app opdrachten kunnen doen, zones afvinken en hierdoor badges verdienen. 
Ook is het belangrijk dat je je collectie kan zien en meer info over een bloem / plant kan vinden.

## Licentie

This project is licensed under the terms of the [MIT license](./LICENSE).
