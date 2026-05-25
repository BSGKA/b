const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Configuration
const TOKEN = "MTUwODQyMzkwMTY0MDY1NTAxOQ.GuE8fW.ZJ0Htdqq-PcKi60DMxEU-1EzoYWUvvAonRj3-k";
const CLIENT_ID = "1508423901640655019";
const GUILD_ID = "1418590948056633467";
const STAFF_CHANNEL_ID = "1508423987909099630";

// Register Slash Command
const commands = [
    new SlashCommandBuilder()
        .setName('redeem')
        .setDescription('Submit your screenshot for verification')
        .addAttachmentOption(option => 
            option.setName('screenshot')
                .setDescription('Upload your proof screenshot')
                .setRequired(true))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Deploy slash commands
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );
        console.log('Successfully registered local slash commands.');
    } catch (error) {
        console.error(error);
    }
});

// Handle Interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    // /redeem Command
    if (interaction.isChatInputCommand() && interaction.commandName === 'redeem') {
        await interaction.deferReply({ ephemeral: true });
        
        const screenshot = interaction.options.getAttachment('screenshot');
        
        // Check if the attachment is an image
        if (!screenshot.contentType?.startsWith('image/')) {
            return interaction.editReply({ content: '❌ Please upload a valid image file!' });
        }

        const staffChannel = client.channels.cache.get(STAFF_CHANNEL_ID);
        if (!staffChannel) {
            return interaction.editReply({ content: '❌ Staff system configuration error. Contact admins.' });
        }

        // Create Embed for Staff
        const staffEmbed = new EmbedBuilder()
            .setTitle('📌 New Redeem Request')
            .setDescription(`**User:** ${interaction.user} (${interaction.user.tag})\n**ID:** ${interaction.user.id}`)
            .setImage(screenshot.url)
            .setColor('#f1c40f')
            .setTimestamp();

        // Buttons for Staff
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`approve_${interaction.user.id}`)
                    .setLabel('Approve')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`reject_${interaction.user.id}`)
                    .setLabel('Reject')
                    .setStyle(ButtonStyle.Danger)
            );

        await staffChannel.send({ embeds: [staffEmbed], components: [row] });
        await interaction.editReply({ content: '✅ Your request has been sent to the staff team for review!' });
    }

    // Button Clicks (Approve / Reject)
    if (interaction.isButton()) {
        await interaction.deferUpdate();
        
        const [action, userId] = interaction.customId.split('_');
        let targetUser;
        
        try {
            targetUser = await client.users.fetch(userId);
        } catch {
            return interaction.followUp({ content: '❌ Could not find the user in database.', ephemeral: true });
        }

        const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);

        if (action === 'approve') {
            originalEmbed.setColor('#2ecc71').setTitle('✅ Request Approved');
            await interaction.message.edit({ embeds: [originalEmbed], components: [] });
            
            try {
                await targetUser.send('🎉 **Your redeem request has been APPROVED by the staff team!**');
            } catch {
                console.log(`Could not DM user ${userId}`);
            }
        } else if (action === 'reject') {
            originalEmbed.setColor('#e74c3c').setTitle('❌ Request Rejected');
            await interaction.message.edit({ embeds: [originalEmbed], components: [] });
            
            try {
                await targetUser.send('❌ **Your redeem request has been REJECTED by the staff team.**');
            } catch {
                console.log(`Could not DM user ${userId}`);
            }
        }
    }
});

client.login(TOKEN);
