const { ApiPromise } = require('@polkadot/api');

async function main () {
    // Create our API with a default connection to the local node
    const api = await ApiPromise.create();

    // subscribe to system events via storage
    api.query.system.events((events) => {
        // loop through the Vec<EventRecord>
        events.forEach((record) => {
            // extract the phase, event and the event types
            const { event, phase } = record;
            const types = event.typeDef;

            if (event.section == 'poker') {
                console.log(`%c ${event.method}: ${event.data}`, 'background: green; color: yellow');

                if (event.method == 'DealerJoined') {
                    game.dealer.changed(event.data[0]);
                }
                if (event.method == 'PlayerJoined') {
                    game.player.changed(event.data[0]);
                }
            }
        });
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(-1);
});
