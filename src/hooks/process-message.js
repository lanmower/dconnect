// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

module.exports = function (options = {}) { // eslint-disable-line no-unused-vars
  return async context => {
    const { data } = context;

    // Throw an error if we didn't get a text
    if(!data.text) {
      throw new Error('A message must have a text');
    }

    // The authenticated user
    const user = context.params.user;
    // The actual message text
    const text = context.data.text
      // Messages can't be longer than 400 characters
      .substring(0, 400);

    const type = context.data.type?context.data.type
      // Messages can't be longer than 400 characters
      .substring(0, 64):'';

    const metadata = context.data.metadata&&context.data.metadata.length<512?context.data.metadata:'';

    // Override the original data (so that people can't submit additional stuff)
    context.data = {
      text, 
      type,
      metadata,
      // Set the user id
      userId: user._id,
      // Add the current date
      createdAt: new Date().getTime()
    };

    // Best practise, hooks should always return the context
    return context;
  };
};
