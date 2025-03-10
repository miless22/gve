require("dotenv").config();
const { token } = process.env;
const { Client, Collection, GatewayIntentBits, REST, Routes, InteractionType } = require("discord.js");
const fs = require("fs");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
client.commandArray = [];

// Function to handle events
const handleEvents = async () => {
    const eventFiles = fs.readdirSync(`./events`).filter((file) => file.endsWith(".js"));
    for (const file of eventFiles) {
        const event = require(`./events/${file}`);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
};

// Function to handle commands
const handleCommands = async () => {
    const commandFolders = fs.readdirSync(`./commands`);
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
            try {
                const command = require(`./commands/${folder}/${file}`);
                if (!command.data || !command.data.name) {
                    console.error(`Command in file ${file} is missing a name property`);
                    continue;
                }
                client.commands.set(command.data.name, command);
                client.commandArray.push(command.data.toJSON());
            } catch (error) {
                console.error(`Failed to load command ${file}: ${error.message}`);
            }
        }
    }

    const clientId = "1294304120663969843"; 
    const guildId = "1294279351629516842"; 
    const rest = new REST({ version: "10" }).setToken(token);

    try {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: client.commandArray,
        });
        console.log("Slash commands uploaded");
    } catch (error) {
        console.error(error);
    }
};

// Main function
const main = async () => {
    client.handleEvents = handleEvents;
    client.handleCommands = handleCommands;

    // Log when the bot comes online
    client.once('ready', () => {
        console.log(`${client.user.tag} is now online!`);
    });

    await client.handleEvents();
    await client.handleCommands();

    client.on('interactionCreate', async (interaction) => {
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (command) {
                try {
                    await command.execute(interaction);
                } catch (error) {
                    console.error(`Error executing command ${interaction.commandName}: ${error.message}`);
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        } else if (interaction.type === InteractionType.ModalSubmit) { // Check for modal submissions
            const modalSubmitHandler = require('./events/modalSubmit');
            await modalSubmitHandler.execute(interaction);
        }
    });

    client.login(token);
};

main();
