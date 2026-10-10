## Introduction

This app will be a quiz app for quizing yourself on countries of the earth.

## Domain language

In this app I want to use specific domain language from Domain Driven Design. The main part from this I want is that we call components and parts of the app the same thing consistently. You and I both. This helps communicate issues and makes it easier to talk about features.

## UI/UX

The app should consist of the following:
 - A navbar. This is located at the top of the screen at all times. This should display information about the current quiz run, like the time spent and the current country to guess. For the scope of the initial request, this can be left empty.
 - The map. This is the main display taking up the rest of the screen, other than the navbar. This should be the full world map as an SVG image. Each country should be displayed in green, while the oceans should be displayed in blue. Using the mouse cursor, this map should be zoomable by scrolling, so you can zoom into even the smallest of countries. The map should also be panable.
 - The start screen. Whenever you open the app, a modal should appear asking you what you want to quiz. For now, we will not have any quiz so there will only be a "dismiss" button.

## Scope

- Create the navbar and the full map display.
- Do not include any of the game yet.

## Current project state

The current state of the project is a clean vite@latest install with the boilerplate still there. You're free to edit any of the code, install packages to use, etc.

## Quiz and future (out of scope here)

As additional context, I want to talk about the type(s) of quiz I want to make. This is mostly so you can already take this into account with the achitecture of the application. The start screen will make it selectable what kind of quiz you can do, with checkboxes to customize your experience:
 - Countries in Europe
 - Countries in Africa
 - Countries in ... (etc)
 - Overseas terretories
 - States of America

You will also get different gameplay modes:
 - Name to location (default, the game gives you the location and you have to click the correct country)
 - Name to location, practise (It will keep going, prompting you again for things you did wrong before, helping you learn)
 - Location to name (game highlights the country, you type in the name)
 - Location to name, practise (same as the other practise mode)
 - Flag to location (game gives you the _flag_ of the country, you click on the country on the map)

This will generate a set of all countries you want to use and shuffle them. Then, one by one prompts you to find them (depending on game mode). Any country not included in the set will be grayed out on the map.

## Potential future

I do also see some future where we'd want to include rivers, oceans and lakes too, but that depends all on whether I would like to see that and whether the data set is available.

## Sources and datasets

You're free to consult sources for the datasets, images and fonts we may need. However, make sure the licenses of these resources are free and open for anyone to use.