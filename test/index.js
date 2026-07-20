do{
        try{
            trajectory = core.next();
        } catch(e) {
            console.error(e);
            // debugger
            throw e;
        }
        lifeTrajectory.push(trajectory);
        const { age, content } = trajectory;

        console.debug(
            `---------------------------------`,
            `\n-- Age ${age}\n   `,
            (content || []).map(
                ({type, description, rate, name, postEvent}) => {
                    switch(type) {
                        case 'TLT':
                            return `Talent ${name}: ${description}`;
                        case 'EVT':
                            return description + (postEvent?`\n    ${postEvent}`:'');
                    }
                }
            ).join('\n    ')
        );
        // if(age == 60) debugger
    } while(!trajectory.isEnd)
