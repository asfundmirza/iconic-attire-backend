"use strict";
// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_KEY);
/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products } = ctx.request.body;
    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::product.product")
            .findOne(product.product.id);

          console.log("this is item------->", item);
          console.log("this is product------->", product);

          return {
            price_data: {
              currency: "pkr",
              product_data: {
                name: item.name,
                description: `Size: ${product.size}`,
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: product.quantity,
          };
        })
      );

      const session = await stripe.checkout.sessions.create({
        invoice_creation: {
          enabled: true,
        },
        phone_number_collection: {
          enabled: true,
        },
        shipping_options: [
          // {
          //   shipping_rate_data: {
          //     type: 'fixed_amount',
          //     fixed_amount: {
          //       amount: 0,
          //       currency: 'usd',
          //     },
          //     display_name: 'Free shipping',
          //     delivery_estimate: {
          //       minimum: {
          //         unit: 'business_day',
          //         value: 5,
          //       },
          //       maximum: {
          //         unit: 'business_day',
          //         value: 7,
          //       },
          //     },
          //   },
          // },
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: {
                amount: Math.round(200 * 100),
                currency: "pkr",
              },
              display_name: "Estimated Time",
              delivery_estimate: {
                minimum: {
                  unit: "business_day",
                  value: 2,
                },
                maximum: {
                  unit: "business_day",
                  value: 3,
                },
              },
            },
          },
        ],
        shipping_address_collection: { allowed_countries: ["PK"] },
        payment_method_types: ["card"],
        mode: "payment",

        success_url: process.env.CLIENT_URL + `/success`,
        cancel_url: process.env.CLIENT_URL + "/failed",
        line_items: lineItems,
      });

      await strapi
        .service("api::order.order")
        .create({ data: { products, stripeId: session.id } });

      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return { error };
    }
  },
}));
