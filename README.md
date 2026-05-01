# MTG Draft Doctor
MTG limited web based deck building tool for limited formats - can be used for building draft or sealed decks. Analyze your current mana curve and get suggestions for cards to cut or add based on mana value! Then, get recommended basic lands to add to your deck based on cost pip counts.

### Basic Mode
&emsp;&nbsp;<img width="800" alt="image" src="https://github.com/user-attachments/assets/a0774b18-1fb8-4f82-86ed-495c230587bb" />

### Advanced Mode
&emsp;&nbsp;<img width="800" alt="image" src="https://github.com/user-attachments/assets/86d54f21-815c-425c-8808-8a0a10939cec" />

### Mana Curve Suggestions
&emsp;&nbsp;<img width="800" alt="image" src="https://github.com/user-attachments/assets/8307f968-ae33-4ad8-927e-11f9ddab3c8c" />

### Basic Land Calculator
&emsp;&nbsp;<img width="800" alt="image" src="https://github.com/user-attachments/assets/6c9ff2a7-62de-4162-a62c-4db9ba6e2f80" />


## How-To
### Basic
1. [optional] adjust the settings on the mana curve tool to make adjustments to the ideal curve ranges. <img width="800" alt="image" src="https://github.com/user-attachments/assets/2305fbd8-6f4f-4ff3-a04f-b144e7963509" />
2. Input number of cards in your deck for each mana cost bucket.
3. Recommended adds or cuts appear to the side of your mana curve. <img width="800" alt="image" src="https://github.com/user-attachments/assets/d5aa0aaf-9d54-44b7-81ac-ca8fe53434b5" />
4. Count the number of nonbasic lands in your deck and input that number into the mana base tool.
5. Count the total number of each colored or colorless mana pip which appears in the cost of the cards. Input them into the mana base tool.
6. Count the amount of colored or colorless mana provided by your nonbasic lands and input that into the mana base tool.
7. Recommended basic land counts for your deck appear to the side of the mana base tool. <img width="800" alt="image" src="https://github.com/user-attachments/assets/31a0ad58-8f42-4004-8fa7-cee91ef17456" />


### Advanced
1. [optional] use set filters to limit the cards which appear in the search (based on which sets you are playing). <img width="400" alt="image" src="https://github.com/user-attachments/assets/7648c93b-5a73-4e57-a57c-1fe2e3ae5da2" />
2. Search for the cards in your deck. Add them to the deck and set the number which appear in your deck.
3. Set the number of additional basic lands you will need to add to your deck. <img width="800" alt="image" src="https://github.com/user-attachments/assets/644c9853-67ef-46a1-9a9a-729d40389622" />
4. [optional] expand the deck preview to see how your cards are grouped based on mana cost. <img width="800" alt="image" src="https://github.com/user-attachments/assets/296cc6fd-8a6e-4a8a-9db5-2071818a181c" />
5. Mana curve and mana base tools are automatically populated based on cards in your deck.
6. Use recommendations to help decide what to cut or add to your deck.

## About
### Author
My name is Simeon Neese. I'm a mechanical engineer and I started playing MTG with my friends in 2025. I attended my first prerelease when Secrets of Strixhaven came out, and it was the most fun I've had playing the game so far. But it got me thinking - as a newer player who still has a lot to learn about building a deck in limited formats, I would have loved to have had a tool to bring with me into the game that was super easy to use and could help me quickly make cuts and calculate how many basic lands I needed to grab for my deck. When you're on a timer, every minute counts. And so, MTG Draft Doctor was born!

### Development
This started out as a proof of concept [Excel workbook](https://github.com/simneese/MTGDraftDoctor/tree/main/Reference) where I worked out the formulas I would need for the land calculator. After that was done, I knew I wanted it to be a web tool so I could quickly pull it up on my phone and could even integrate the Scryfall card database so I could use specific cards rather than just put numbers in boxes. I was somewhat inspired by Salubrious Snail's [manabase tool](https://www.salubrioussnail.com/manabase-tool), which I use all the time for building commander decks. Some features I am tossing around are things like having multiple decks you can switch between, and in advanced mode having a sideboard option. I'm just having fun working on this tool for myself, and I hope other people will use it too!
